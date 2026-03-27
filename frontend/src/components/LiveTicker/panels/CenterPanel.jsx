import { useState, useEffect, useCallback, useRef, memo, useMemo } from "react";
import PropTypes from "prop-types";
import { AIDraft } from "../components/AIDraft";
import { CollapsibleSection } from "../components/CollapsibleSection";
import { EntryEditor } from "../components/EntryEditor";
import { EventCard } from "../components/EventCard";
import { MediaPickerPanel } from "../components/MediaPickerPanel";
import { ClipPickerPanel } from "../components/ClipPickerPanel";
import { SummarySection } from "../components/SummarySection";
import { getSummaryMeta, getDraftLabel } from "../components/SummaryRow";
import { YouTubePanel } from "../components/YouTubePanel";
import { TwitterPanel } from "../components/TwitterPanel";
import { InstagramPanel } from "../components/InstagramPanel";
import {
  MODES,
  TICKER_STYLES,
  PREMATCH_PHASES,
  AUTO_ERROR_TIMEOUT_MS,
} from "../constants";
import logger from "../../../utils/logger";
import { useTickerModeContext } from "../../../context/TickerModeContext";
import { useTickerDataContext } from "../../../context/TickerDataContext";
import { useTickerActionsContext } from "../../../context/TickerActionsContext";
import { useAutoPublisher } from "../hooks/useAutoPublisher";
import * as api from "../../../api";
import config from "../../../config/whitelabel";

// Welcher Stil im AUTO-Modus verwendet wird
const AUTO_STYLE = TICKER_STYLES[0];

export const CenterPanel = memo(function CenterPanel({
  currentMinute = 0,
  generatingId,
  instance = "ef_whitelabel",
  lineups = [],
  players = [],
}) {
  const { mode } = useTickerModeContext();
  const { match, events, tickerTexts, reload } = useTickerDataContext();
  const { onGenerate, onManualPublish, onDraftActive, onPublished, retractedText, clearRetractedText } =
    useTickerActionsContext();

  // Player + team names for autocomplete
  const playerNames = useMemo(() => {
    const fromLineup = lineups.map((l) => l.playerName).filter(Boolean);
    const fromPlayers =
      fromLineup.length > 0
        ? fromLineup
        : players
            .map(
              (p) =>
                p.knownName ||
                p.displayName ||
                `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim(),
            )
            .filter(Boolean);
    const teamNames = [match?.homeTeam?.name, match?.awayTeam?.name].filter(Boolean);
    return [...new Set([...fromPlayers, ...teamNames])];
  }, [lineups, players, match]);

  const [selectedEventId, setSelectedEventId] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editorValue, setEditorValue] = useState("");
  const editorValueRef = useRef("");
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkPublishingSection, setBulkPublishingSection] = useState(null);
  const [selectedSummaryDraftId, setSelectedSummaryDraftId] = useState(null);
  const [pendingAutoExpandId, setPendingAutoExpandId] = useState(null);
  const [dismissedIds, setDismissedIds] = useState(new Set());
  const [autoError, setAutoError] = useState(null);

  const pendingEvents = useMemo(() => {
    const seenSourceIds = new Set();
    return events.filter((ev) => {
      if (dismissedIds.has(ev.id)) return false;
      if (
        tickerTexts.find(
          (t) =>
            t.event_id === ev.id &&
            (t.status === "published" || t.status === "rejected"),
        )
      )
        return false;
      if (ev.sourceId) {
        if (seenSourceIds.has(ev.sourceId)) return false;
        seenSourceIds.add(ev.sourceId);
      }
      return true;
    });
  }, [events, dismissedIds, tickerTexts]);

  const handleDismissEvent = useCallback(
    async (ev, draft) => {
      if (draft) {
        await api.updateTicker(draft.id, { status: "rejected" });
        await reload.loadTickerTexts();
      } else {
        setDismissedIds((prev) => new Set([...prev, ev.id]));
      }
      if (selectedEventId === ev.id) setSelectedEventId(null);
    },
    [selectedEventId, reload],
  );

  const selectedEvent = useMemo(
    () => pendingEvents.find((e) => e.id === selectedEventId) ?? null,
    [pendingEvents, selectedEventId],
  );

  const selectedDraft = useMemo(
    () =>
      selectedEvent
        ? tickerTexts.find((t) => t.event_id === selectedEvent.id)
        : null,
    [selectedEvent, tickerTexts],
  );

  const isOurTeam = useMemo(
    () =>
      match?.homeTeam?.name?.toLowerCase().includes(config.teamKeyword) ||
      match?.awayTeam?.name?.toLowerCase().includes(config.teamKeyword),
    [match],
  );

  // ── AUTO-Modus: generate → publish ──────────────────────────
  useAutoPublisher({
    instance,
    pendingEvents,
    onError: setAutoError,
  });

  // Auto-dismiss AUTO-Modus Fehler nach Timeout
  useEffect(() => {
    if (!autoError) return;
    const id = setTimeout(() => setAutoError(null), AUTO_ERROR_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [autoError]);

  // ── Aktiven Draft nach oben melden (CO-OP) ──────────────────
  useEffect(() => {
    if (selectedDraft) onDraftActive?.(selectedDraft.id, selectedDraft.text);
    else onDraftActive?.(null, "");
  }, [selectedDraft, onDraftActive]);

  // Ref hält aktuellen editorValue synchron → lesbar in Effects ohne Dep
  editorValueRef.current = editorValue;

  // ── Text-Restore nach Manual-Stornierung ────────────────────
  useEffect(() => {
    if (!retractedText) return;
    if (!editorValueRef.current.trim()) setEditorValue(retractedText);
    clearRetractedText();
  }, [retractedText, clearRetractedText]);

  // ── Auto-Expand nach Stornierung ────────────────────────────
  useEffect(() => {
    if (!pendingAutoExpandId) return;
    const targetDraft = tickerTexts.find(
      (t) => t.id === pendingAutoExpandId && t.status === "draft" && !t.event_id,
    );
    if (targetDraft) {
      setSelectedSummaryDraftId(pendingAutoExpandId);
      setPendingAutoExpandId(null);
    }
  }, [tickerTexts, pendingAutoExpandId]);

  const handleBulkPublish = useCallback(async () => {
    setBulkGenerating(true);
    try {
      const freshRes = await api.fetchTickerTexts(match.id);
      const drafts = (freshRes.data ?? []).filter(
        (t) => t.status !== "published" && t.event_id,
      );
      for (const d of drafts) await api.publishTicker(d.id, d.text);
      await reload.loadTickerTexts();
    } catch (err) {
      logger.error("bulkPublish failed", err);
    } finally {
      setBulkGenerating(false);
    }
  }, [match, reload]);

  const handleBulkGenerate = useCallback(async () => {
    if (!pendingEvents.length) return;
    setBulkGenerating(true);
    try {
      const withoutDraft = pendingEvents.filter(
        (ev) => !tickerTexts.find((t) => t.event_id === ev.id),
      );
      for (const ev of withoutDraft) {
        await api.generateTicker(ev.id, AUTO_STYLE, instance);
      }
      const freshRes = await api.fetchTickerTexts(match.id);
      const drafts = (freshRes.data ?? []).filter(
        (t) => t.status !== "published" && t.event_id,
      );
      for (const d of drafts) await api.publishTicker(d.id, d.text);
      await reload.loadTickerTexts();
    } catch (err) {
      logger.error("bulkGenerate failed", err);
    } finally {
      setBulkGenerating(false);
    }
  }, [pendingEvents, tickerTexts, match, reload, instance]);

  const handleBulkPublishPrematch = useCallback(async () => {
    setBulkPublishingSection("prematch");
    try {
      const freshRes = await api.fetchTickerTexts(match.id);
      const drafts = (freshRes.data ?? []).filter(
        (t) => t.status === "draft" && !t.event_id && PREMATCH_PHASES.has(t.phase),
      );
      for (const d of drafts) await api.publishTicker(d.id, d.text);
      await reload.loadTickerTexts();
    } catch (err) {
      logger.error("bulkPublishPrematch failed", err);
    } finally {
      setBulkPublishingSection(null);
    }
  }, [match, reload]);

  const handleBulkPublishSpielphase = useCallback(async () => {
    setBulkPublishingSection("spielphasen");
    try {
      const freshRes = await api.fetchTickerTexts(match.id);
      const drafts = (freshRes.data ?? []).filter(
        (t) => t.status === "draft" && !t.event_id && !PREMATCH_PHASES.has(t.phase),
      );
      for (const d of drafts) {
        if (d.icon === "🎬" || d.video_url) {
          await api.updateTicker(d.id, { status: "published" });
        } else {
          await api.publishTicker(d.id, d.text);
        }
      }
      await reload.loadTickerTexts();
    } catch (err) {
      logger.error("bulkPublishSpielphase failed", err);
    } finally {
      setBulkPublishingSection(null);
    }
  }, [match, reload]);

  // ── Style-Regeneration für Summary-Drafts ───────────────────
  const handleRegenerateSummaryDraft = useCallback(
    async (draftId, style) => {
      setBulkPublishingSection("regenerating");
      const oldDraft = tickerTexts.find((t) => t.id === draftId);
      if (!oldDraft) { setBulkPublishingSection(null); return; }
      const phase = oldDraft.phase;
      const isPrematch = PREMATCH_PHASES.has(phase);
      try {
        await api.deleteTicker(draftId);
        if (isPrematch) {
          await api.generateSyntheticBatch(match.id, style, instance);
        } else {
          await api.generateMatchPhases(match.id, style, instance, undefined, false);
        }
        await reload.loadTickerTexts();
        const res = await api.fetchTickerTexts(match.id);
        const newDraft = (res.data ?? []).find((t) =>
          isPrematch && oldDraft.synthetic_event_id
            ? t.synthetic_event_id === oldDraft.synthetic_event_id && t.status === "draft"
            : t.status === "draft" && !t.event_id && t.phase === phase,
        );
        setSelectedSummaryDraftId(newDraft?.id ?? null);
      } catch (err) {
        logger.error("regenerateSummaryDraft failed", err);
        setSelectedSummaryDraftId(null);
      } finally {
        setBulkPublishingSection(null);
      }
    },
    [tickerTexts, match, reload, instance],
  );

  const handleRegenerateEventDraft = useCallback(
    async (eventId, style) => {
      const existing = tickerTexts.find(
        (t) => t.event_id === eventId && t.status !== "rejected",
      );
      if (existing) await api.deleteTicker(existing.id);
      await onGenerate(eventId, style);
    },
    [tickerTexts, onGenerate],
  );

  const handleAcceptDraft = useCallback(async () => {
    if (!selectedDraft) return;
    await api.publishTicker(selectedDraft.id, selectedDraft.text);
    await reload.loadTickerTexts();
    onPublished?.(selectedDraft.id, selectedDraft.text);
  }, [selectedDraft, reload, onPublished]);

  const handleRejectDraft = useCallback(async () => {
    if (!selectedDraft) return;
    await api.updateTicker(selectedDraft.id, { status: "rejected" });
    await reload.loadTickerTexts();
  }, [selectedDraft, reload]);

  const handleOpenEdit = useCallback(() => {
    setEditorValue(selectedDraft?.text ?? "");
    setEditMode(true);
  }, [selectedDraft]);

  const handleManualPublish = useCallback(
    async ({ text, icon, minute, phase } = {}) => {
      const textToPublish = text ?? editorValue.trim();
      if (!textToPublish) return;
      const rawInput = editorValue.trim();
      await onManualPublish(textToPublish, icon, minute, phase, rawInput);
      setEditorValue("");
    },
    [editorValue, onManualPublish],
  );

  const handleEditPublish = useCallback(
    async ({ text } = {}) => {
      const textToPublish = text ?? editorValue.trim();
      if (!selectedDraft || !textToPublish) return;
      try {
        await api.publishTicker(selectedDraft.id, textToPublish);
        await reload.loadTickerTexts();
        onPublished?.(selectedDraft.id, textToPublish);
        setEditorValue("");
        setEditMode(false);
        setSelectedEventId(null);
      } catch (err) {
        logger.error("editPublish failed", err);
      }
    },
    [selectedDraft, editorValue, reload, onPublished],
  );

  if (!match) {
    return (
      <div className="lt-col lt-col--events">
        <div className="lt-center__empty">
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>⚽</div>
          Kein Spiel ausgewählt
        </div>
      </div>
    );
  }

  return (
    <div className="lt-col lt-col--events">
      <div className="lt-center__inner">

        {/* ── AUTO ──────────────────────────────────────────── */}
        {mode === MODES.AUTO && (
          <>
            <div className="lt-center__auto-info">
              <div className="lt-center__auto-dot" />
              AI generiert und veröffentlicht Einträge automatisch.
            </div>
            {autoError && (
              <div
                style={{
                  marginTop: "0.5rem", borderRadius: 6, padding: "0.4rem 0.75rem",
                  background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
                  fontFamily: "var(--lt-font-mono)", fontSize: "0.7rem", color: "#f87171",
                }}
              >
                ⚠ {autoError}
              </div>
            )}
            {pendingEvents.length > 0 && (
              <div style={{ marginTop: "1rem" }}>
                <div className="lt-center__section-title">
                  Warteschlange ({pendingEvents.length})
                </div>
                {pendingEvents.map((ev) => (
                  <EventCard
                    key={ev.id}
                    event={ev}
                    draft={tickerTexts.find((t) => t.event_id === ev.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── CO-OP ─────────────────────────────────────────── */}
        {mode === MODES.COOP && (
          <>
            <SummarySection
              isPrematch={true}
              title="Vorberichterstattung"
              selectedId={selectedSummaryDraftId}
              onSelect={setSelectedSummaryDraftId}
              generatingId={bulkPublishingSection}
              onBulkPublish={handleBulkPublishPrematch}
              onRegenerate={handleRegenerateSummaryDraft}
            />

            <SummarySection
              isPrematch={false}
              title="Spielphasen"
              selectedId={selectedSummaryDraftId}
              onSelect={setSelectedSummaryDraftId}
              generatingId={bulkPublishingSection}
              onBulkPublish={handleBulkPublishSpielphase}
              onRegenerate={handleRegenerateSummaryDraft}
            />

            {/* Veröffentlicht – Vorberichterstattung & Spielphasen */}
            {(() => {
              const published = tickerTexts
                .filter((t) => t.status === "published" && !t.event_id)
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
              if (!published.length) return null;
              return (
                <CollapsibleSection
                  title="Veröffentlicht"
                  count={published.length}
                  defaultOpen={false}
                >
                  {published.map((entry) => {
                    const { icon, cssClass } = getSummaryMeta(entry, entry.phase);
                    const label = getDraftLabel(entry);
                    return (
                      <div
                        key={entry.id}
                        className={`lt-event-card lt-event-card__${cssClass}`}
                        style={{ opacity: 0.65 }}
                      >
                        <div className="lt-event-card__row">
                          <span className="lt-event-card__icon">{icon}</span>
                          <span className="lt-event-card__raw">
                            {label}
                            {entry.text
                              ? ` · ${entry.text.slice(0, 50)}${entry.text.length > 50 ? "…" : ""}`
                              : ""}
                          </span>
                          <button
                            onClick={async () => {
                              const entryId = entry.id;
                              setPendingAutoExpandId(entryId);
                              await api.updateTicker(entryId, { status: "draft" });
                              await reload.loadTickerTexts();
                            }}
                            style={{
                              marginLeft: "auto", flexShrink: 0, background: "none",
                              border: "1px solid var(--lt-border)", color: "var(--lt-text-muted)",
                              cursor: "pointer", fontSize: "0.7rem", padding: "1px 8px",
                              borderRadius: 4, whiteSpace: "nowrap",
                            }}
                          >
                            ↩ Stornieren
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </CollapsibleSection>
              );
            })()}

            {/* Events */}
            {pendingEvents.length === 0 && (
              <div className="lt-empty">
                <div className="lt-empty__icon">✓</div>
                Alle Events verarbeitet
              </div>
            )}

            {pendingEvents.length > 0 && (
              <CollapsibleSection
                title="Events"
                count={pendingEvents.length}
                onToggle={(open) => { if (!open) setSelectedEventId(null); }}
                actions={
                  pendingEvents.length > 1 ? (
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      {pendingEvents.some((ev) =>
                        tickerTexts.find(
                          (t) => t.event_id === ev.id && t.status !== "published",
                        ),
                      ) && (
                        <button
                          className="lt-event-card__gen-btn"
                          onClick={handleBulkPublish}
                          disabled={bulkGenerating}
                          title="Alle vorhandenen Drafts veröffentlichen"
                        >
                          {bulkGenerating ? "…" : "✓ Alle"}
                        </button>
                      )}
                      {pendingEvents.some(
                        (ev) => !tickerTexts.find((t) => t.event_id === ev.id),
                      ) && (
                        <button
                          className="lt-event-card__gen-btn"
                          onClick={handleBulkGenerate}
                          disabled={bulkGenerating}
                          title="KI-Texte für alle Events generieren"
                        >
                          {bulkGenerating ? "…" : "✦ Generieren"}
                        </button>
                      )}
                    </div>
                  ) : null
                }
              >
                {pendingEvents.map((ev) => {
                  const draft = tickerTexts.find((t) => t.event_id === ev.id);
                  const isSelected = selectedEvent?.id === ev.id;
                  return (
                    <div key={ev.id}>
                      <EventCard
                        event={ev}
                        draft={draft}
                        isSelected={isSelected}
                        onSelect={() => {
                          setSelectedEventId(ev.id);
                          setEditMode(false);
                        }}
                        onDismiss={() => handleDismissEvent(ev, draft)}
                      />
                      {isSelected &&
                        (editMode ? (
                          <EntryEditor
                            value={editorValue || draft?.text || ""}
                            onChange={setEditorValue}
                            onPublish={handleEditPublish}
                            onCancel={() => setEditMode(false)}
                            mode={mode}
                            currentMinute={ev.time}
                            playerNames={playerNames}
                          />
                        ) : (
                          <AIDraft
                            eventType={ev.liveTickerEventType}
                            draftText={
                              draft?.text ??
                              "Kein Draft vorhanden – generiere einen Stil."
                            }
                            onAccept={handleAcceptDraft}
                            onReject={handleRejectDraft}
                            onEdit={handleOpenEdit}
                            onTextClick={handleOpenEdit}
                            onGenerate={handleRegenerateEventDraft}
                            generatingId={generatingId}
                            eventId={ev.id}
                          />
                        ))}
                    </div>
                  );
                })}
              </CollapsibleSection>
            )}
          </>
        )}

        {/* ── MANUAL ────────────────────────────────────────── */}
        {mode === MODES.MANUAL && (
          <EntryEditor
            value={editorValue}
            onChange={setEditorValue}
            onPublish={handleManualPublish}
            mode={mode}
            currentMinute={currentMinute}
            playerNames={playerNames}
          />
        )}

        {/* ── ScorePlay Bilder ──────────────────────────────── */}
        <div style={{ marginTop: "1rem" }}>
          <MediaPickerPanel
            match={match}
            matchId={match.id}
            playerNames={playerNames}
            currentMinute={currentMinute}
            lineups={lineups}
          />
        </div>

        {/* ── Tor-Clips ─────────────────────────────────────── */}
        <div style={{ marginTop: "0.5rem" }}>
          <ClipPickerPanel
            matchId={match.id}
            match={match}
            currentMinute={currentMinute}
            onPublished={() => reload.loadTickerTexts()}
          />
        </div>

        {/* ── YouTube / X / Instagram – nur bei Team-Spielen ── */}
        {isOurTeam && (
          <>
            <div style={{ marginTop: "0.5rem" }}>
              <YouTubePanel matchId={match.id} currentMinute={currentMinute} />
            </div>
            <div style={{ marginTop: "0.5rem" }}>
              <TwitterPanel matchId={match.id} currentMinute={currentMinute} />
            </div>
            <div style={{ marginTop: "0.5rem" }}>
              <InstagramPanel matchId={match.id} currentMinute={currentMinute} />
            </div>
          </>
        )}
      </div>
    </div>
  );
});

// match, events, tickerTexts, reload → via TickerDataContext
// onGenerate, onManualPublish, onDraftActive, onPublished → via TickerActionsContext
CenterPanel.propTypes = {
  currentMinute: PropTypes.number,
  generatingId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  instance: PropTypes.string,
  lineups: PropTypes.arrayOf(PropTypes.shape({ playerName: PropTypes.string })),
  players: PropTypes.arrayOf(
    PropTypes.shape({
      knownName: PropTypes.string,
      displayName: PropTypes.string,
      firstName: PropTypes.string,
      lastName: PropTypes.string,
    }),
  ),
};
