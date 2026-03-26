import { useState, useEffect, useCallback, useRef, memo, useMemo } from "react";
import PropTypes from "prop-types";
import { AIDraft } from "../components/AIDraft";
import { EntryEditor } from "../components/EntryEditor";
import { MediaPickerPanel } from "../components/MediaPickerPanel";
import { ClipPickerPanel } from "../components/ClipPickerPanel";
import { YouTubePanel } from "../components/YouTubePanel";
import { TwitterPanel } from "../components/TwitterPanel";
import { InstagramPanel } from "../components/InstagramPanel";
import { MODES, TICKER_STYLES } from "../constants";
import logger from "../../../utils/logger";
import { useTickerModeContext } from "../../../context/TickerModeContext";
import { getEventMeta, getRawEventText } from "../utils/parseCommand";
import * as api from "../../../api";
import config from "../../../config/whitelabel";

// Welcher Stil im AUTO-Modus verwendet wird
const AUTO_STYLE = TICKER_STYLES[0];

const PREMATCH_PHASES = new Set(["Before", "PreMatch"]);

const PHASE_LABEL = {
  Before: "Vorberichterstattung",
  PreMatch: "Vorberichterstattung",
  FirstHalf: "Anpfiff 1. HZ",
  FirstHalfBreak: "Halbzeit",
  SecondHalf: "Anpfiff 2. HZ",
  FullTime: "Abpfiff",
  After: "Abpfiff",
  ExtraFirstHalf: "Verlängerung",
  ExtraBreak: "VZ-Pause",
  ExtraSecondHalf: "Verlängerung 2. HZ",
  PenaltyShootout: "Elfmeterschießen",
};

function getDraftLabel(draft) {
  if (draft.phase && PHASE_LABEL[draft.phase]) return PHASE_LABEL[draft.phase];
  if (draft.icon === "🔔") return "Halbzeit";
  return "KI-Text";
}

function AutoPlayVideo({ src, style }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.play().catch(() => {});
  }, [src]);
  return <video ref={ref} src={src} loop muted playsInline controls style={style} />;
}

export const CenterPanel = memo(function CenterPanel({
  match,
  currentMinute = 0,
  events,
  tickerTexts,
  generatingId,
  onGenerate,
  onManualPublish,
  onDraftActive,
  onPublished,
  reload,
  instance = "ef_whitelabel",
  lineups = [],
  players = [],
}) {
  const { mode } = useTickerModeContext();

  // Player + team names for autocomplete
  const playerNames = useMemo(() => {
    // Player names from lineup (backend joins player_name directly)
    const fromLineup = lineups.map((l) => l.playerName).filter(Boolean);
    const fromPlayers = fromLineup.length > 0 ? fromLineup : players
      .map((p) => p.knownName || p.displayName || `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim())
      .filter(Boolean);

    // Team names from match
    const teamNames = [match?.homeTeam?.name, match?.awayTeam?.name].filter(Boolean);

    // Deduplicate
    return [...new Set([...fromPlayers, ...teamNames])];
  }, [lineups, players, match]);

  const [selectedEventId, setSelectedEventId] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editorValue, setEditorValue] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [dismissedIds, setDismissedIds] = useState(new Set());
  const [autoError, setAutoError] = useState(null);

  // Set mit Event-IDs die gerade auto-prozessiert werden → kein Doppel-Trigger
  const processingRef = useRef(new Set());

  const pendingEvents = useMemo(() => {
    const seenSourceIds = new Set();
    return events.filter((ev) => {
      if (dismissedIds.has(ev.id)) return false;
      if (tickerTexts.find(
        (t) => t.event_id === ev.id &&
               (t.status === "published" || t.status === "rejected" || !t.status),
      )) return false;
      // Deduplicate events imported multiple times (same sourceId, different DB id)
      if (ev.sourceId) {
        if (seenSourceIds.has(ev.sourceId)) return false;
        seenSourceIds.add(ev.sourceId);
      }
      return true;
    });
  }, [events, dismissedIds, tickerTexts]);

  const handleDismissEvent = useCallback(async (ev, draft) => {
    if (draft) {
      await api.updateTicker(draft.id, { status: "rejected" });
      await reload.loadTickerTexts();
    } else {
      setDismissedIds((prev) => new Set([...prev, ev.id]));
    }
    if (selectedEventId === ev.id) setSelectedEventId(null);
  }, [selectedEventId, reload]);
  const selectedEvent = useMemo(() =>
    pendingEvents.find((e) => e.id === selectedEventId) ?? pendingEvents[0] ?? null,
  [pendingEvents, selectedEventId]);

  const selectedDraft = useMemo(() =>
    selectedEvent ? tickerTexts.find((t) => t.event_id === selectedEvent.id) : null,
  [selectedEvent, tickerTexts]);

  const isOurTeam = useMemo(() =>
    match?.homeTeam?.name?.toLowerCase().includes(config.teamKeyword) ||
    match?.awayTeam?.name?.toLowerCase().includes(config.teamKeyword),
  [match]);

  // ── AUTO-Modus: manuelle Drafts (Zusammenfassungen) publishen ──
  useEffect(() => {
    if (mode !== MODES.AUTO) return;
    const manualDrafts = tickerTexts.filter((t) => t.status === "draft" && !t.event_id);
    for (const d of manualDrafts) {
      if (processingRef.current.has(`manual-${d.id}`)) continue;
      processingRef.current.add(`manual-${d.id}`);
      api.publishTicker(d.id, d.text)
        .then(() => reload.loadTickerTexts())
        .catch((err) => logger.error("auto publish manual draft failed", err))
        .finally(() => processingRef.current.delete(`manual-${d.id}`));
    }
  }, [mode, tickerTexts]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── AUTO-Modus: generate → publish ──────────────────────
  useEffect(() => {
    if (mode !== MODES.AUTO) return;

    for (const ev of pendingEvents) {
      if (processingRef.current.has(ev.id)) continue;

      const existingDraft = tickerTexts.find((t) => t.event_id === ev.id);

      if (existingDraft && existingDraft.status !== "published") {
        // Draft existiert bereits → direkt publishen
        processingRef.current.add(ev.id);
        api
          .publishTicker(existingDraft.id, existingDraft.text)
          .then(() => reload.loadTickerTexts())
          .catch((err) => {
            logger.error("auto publish failed", err);
            setAutoError(err?.response?.data?.detail ?? err.message ?? "Auto-Publish fehlgeschlagen");
          })
          .finally(() => processingRef.current.delete(ev.id));
      } else if (!existingDraft) {
        // Noch kein Draft → generieren, dann publishen
        processingRef.current.add(ev.id);
        api
          .generateTicker(ev.id, AUTO_STYLE, instance)
          .then(() => reload.loadTickerTexts())
          .then(async () => {
            const res = await api.fetchTickerTexts(match.id);
            const draft = res.data.find(
              (t) => t.event_id === ev.id && t.status !== "published",
            );
            if (draft) {
              await api.publishTicker(draft.id, draft.text);
              await reload.loadTickerTexts();
            }
          })
          .catch((err) => {
            logger.error("auto generate+publish failed", err);
            setAutoError(err?.response?.data?.detail ?? err.message ?? "Auto-Generierung fehlgeschlagen");
          })
          .finally(() => processingRef.current.delete(ev.id));
      }
    }
  }, [mode, pendingEvents, tickerTexts]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-dismiss AUTO-Modus Fehler nach 6s
  useEffect(() => {
    if (!autoError) return;
    const id = setTimeout(() => setAutoError(null), 6000);
    return () => clearTimeout(id);
  }, [autoError]);

  // ── Aktiven Draft nach oben melden (CO-OP) ───────────────
  useEffect(() => {
    if (selectedDraft) onDraftActive?.(selectedDraft.id, selectedDraft.text);
    else onDraftActive?.(null, "");
  }, [selectedDraft, onDraftActive]);

  const handleBulkPublish = useCallback(async () => {
    setBulkGenerating(true);
    try {
      const freshRes = await api.fetchTickerTexts(match.id);
      const drafts = (freshRes.data ?? []).filter(
        (t) => t.status !== "published" && t.event_id,
      );
      for (const d of drafts) {
        await api.publishTicker(d.id, d.text);
      }
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
      // 1. Alle Events ohne Draft: generieren
      const withoutDraft = pendingEvents.filter(
        (ev) => !tickerTexts.find((t) => t.event_id === ev.id),
      );
      for (const ev of withoutDraft) {
        await api.generateTicker(ev.id, AUTO_STYLE, instance);
      }

      // 2. Alle Drafts (inkl. neu generierte) publishen
      const freshRes = await api.fetchTickerTexts(match.id);
      const allTexts = freshRes.data ?? [];
      const drafts = allTexts.filter(
        (t) => t.status !== "published" && t.event_id,
      );
      for (const d of drafts) {
        await api.publishTicker(d.id, d.text);
      }

      await reload.loadTickerTexts();
    } catch (err) {
      logger.error("bulkGenerate failed", err);
    } finally {
      setBulkGenerating(false);
    }
  }, [pendingEvents, tickerTexts, match, reload, instance]);

  const handleAcceptDraft = useCallback(async () => {
    if (!selectedDraft) return;
    await api.publishTicker(selectedDraft.id, selectedDraft.text);
    await reload.loadTickerTexts();
    onPublished?.(selectedDraft.id, selectedDraft.text);
  }, [selectedDraft, reload, onPublished]);

  const handleRejectDraft = useCallback(async () => {
    if (!selectedDraft) return;
    await api.deleteTicker(selectedDraft.id);
    await reload.loadTickerTexts();
  }, [selectedDraft, reload]);

  const handleOpenEdit = useCallback(() => {
    setEditorValue(selectedDraft?.text ?? "");
    setEditMode(true);
  }, [selectedDraft]);

  const handleManualPublish = useCallback(async ({ text, icon, minute, phase } = {}) => {
    const textToPublish = text ?? editorValue.trim();
    if (!textToPublish) return;
    await onManualPublish(textToPublish, icon, minute, phase);
    setEditorValue("");
  }, [editorValue, onManualPublish]);

  const handleEditPublish = useCallback(async ({ text } = {}) => {
    const textToPublish = text ?? editorValue.trim();
    if (!selectedDraft || !textToPublish) return;
    setPublishing(true);
    try {
      await api.publishTicker(selectedDraft.id, textToPublish);
      await reload.loadTickerTexts();
      onPublished?.(selectedDraft.id, textToPublish);
      setEditorValue("");
      setEditMode(false);
      setSelectedEventId(null);
    } catch (err) {
      logger.error("editPublish failed", err);
    } finally {
      setPublishing(false);
    }
  }, [selectedDraft, editorValue, reload, onPublished]);

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
        {/* ── AUTO ────────────────────────────────────────── */}
        {mode === MODES.AUTO && (
          <>
            <div className="lt-center__auto-info">
              <div className="lt-center__auto-dot" />
              AI generiert und veröffentlicht Einträge automatisch.
            </div>
            {autoError && (
              <div style={{
                marginTop: "0.5rem",
                borderRadius: 6, padding: "0.4rem 0.75rem",
                background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
                fontFamily: "var(--lt-font-mono)", fontSize: "0.7rem", color: "#f87171",
              }}>
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
                    generatingId={generatingId}
                    onGenerate={onGenerate}
                    showGenButtons={false}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── CO-OP ───────────────────────────────────────── */}
        {mode === MODES.COOP && (
          <>
            {/* Vorberichterstattung */}
            {(() => {
              const drafts = tickerTexts.filter((t) => t.status === "draft" && !t.event_id && PREMATCH_PHASES.has(t.phase));
              if (!drafts.length) return null;
              return (
                <CollapsibleSection title="Vorberichterstattung" count={drafts.length}>
                  {drafts.map((draft) => (
                    <SummaryDraftCard
                      key={draft.id}
                      draft={draft}
                      label={getDraftLabel(draft)}
                      onPublish={async (text) => { await api.publishTicker(draft.id, text); await reload.loadTickerTexts(); }}
                      onReject={async () => { await api.updateTicker(draft.id, { status: "rejected" }); await reload.loadTickerTexts(); }}
                    />
                  ))}
                </CollapsibleSection>
              );
            })()}

            {/* Spielphasen + Videos */}
            {(() => {
              const drafts = tickerTexts.filter((t) => t.status === "draft" && !t.event_id && !PREMATCH_PHASES.has(t.phase));
              if (!drafts.length) return null;
              return (
                <CollapsibleSection title="Spielphasen" count={drafts.length}>
                  {drafts.map((draft) => {
                    const isVideo = draft.icon === "🎬" || !!draft.video_url;
                    return isVideo ? (
                      <div key={draft.id} style={{ background: "var(--lt-surface)", borderRadius: 8, padding: "0.75rem", border: "1px solid var(--lt-border)", marginBottom: "0.5rem" }}>
                        <div style={{ fontFamily: "var(--lt-font-mono)", fontSize: "0.7rem", color: "var(--lt-text-muted)", marginBottom: "0.5rem" }}>🎬 Video</div>
                        {draft.video_url && (
                          <AutoPlayVideo src={draft.video_url} style={{ width: "100%", borderRadius: 6, marginBottom: "0.5rem", maxHeight: 220 }} />
                        )}
                        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                          <button className="lt-event-card__gen-btn" style={{ flex: 1, background: "rgba(34,197,94,0.15)", color: "#4ade80" }}
                            onClick={async () => { await api.updateTicker(draft.id, { status: "published" }); await reload.loadTickerTexts(); }}>✓ Veröffentlichen</button>
                          <button className="lt-event-card__gen-btn" style={{ flex: 1, background: "rgba(239,68,68,0.1)", color: "#f87171" }}
                            onClick={async () => { await api.updateTicker(draft.id, { status: "rejected" }); await reload.loadTickerTexts(); }}>✕ Ablehnen</button>
                        </div>
                      </div>
                    ) : (
                      <SummaryDraftCard
                        key={draft.id}
                        draft={draft}
                        label={getDraftLabel(draft)}
                        onPublish={async (text) => { await api.publishTicker(draft.id, text); await reload.loadTickerTexts(); }}
                        onReject={async () => { await api.updateTicker(draft.id, { status: "rejected" }); await reload.loadTickerTexts(); }}
                      />
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
                actions={pendingEvents.length > 1 ? (
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    {pendingEvents.some((ev) => tickerTexts.find((t) => t.event_id === ev.id && t.status !== "published")) && (
                      <button className="lt-event-card__gen-btn" onClick={handleBulkPublish} disabled={bulkGenerating} title="Alle vorhandenen Drafts veröffentlichen">
                        {bulkGenerating ? "…" : "✓ Alle"}
                      </button>
                    )}
                    {pendingEvents.some((ev) => !tickerTexts.find((t) => t.event_id === ev.id)) && (
                      <button className="lt-event-card__gen-btn" onClick={handleBulkGenerate} disabled={bulkGenerating} title="KI-Texte für alle Events generieren">
                        {bulkGenerating ? "…" : "✦ Generieren"}
                      </button>
                    )}
                  </div>
                ) : null}
              >
                {pendingEvents.map((ev) => {
                  const draft = tickerTexts.find((t) => t.event_id === ev.id);
                  return (
                    <EventCard
                      key={ev.id}
                      event={ev}
                      draft={draft}
                      isSelected={selectedEvent?.id === ev.id}
                      generatingId={generatingId}
                      onGenerate={onGenerate}
                      onSelect={() => { setSelectedEventId(ev.id); setEditMode(false); }}
                      onDismiss={() => handleDismissEvent(ev, draft)}
                      showGenButtons
                    />
                  );
                })}
              </CollapsibleSection>
            )}

            {selectedEvent &&
              (editMode ? (
                <EntryEditor
                  value={editorValue || selectedDraft?.text || ""}
                  onChange={setEditorValue}
                  onPublish={handleEditPublish}
                  onCancel={() => setEditMode(false)}
                  mode={mode}
                  currentMinute={selectedEvent.time}
                  playerNames={playerNames}
                />
              ) : (
                <AIDraft
                  eventType={selectedEvent.liveTickerEventType}
                  draftText={selectedDraft?.text ?? "Kein Draft vorhanden – generiere einen Stil."}
                  onAccept={handleAcceptDraft}
                  onReject={handleRejectDraft}
                  onEdit={handleOpenEdit}
                  onTextClick={handleOpenEdit}
                />
              ))}

            {selectedEvent && !selectedDraft && (
              <div style={{ marginTop: "0.75rem" }}>
                <div className="lt-center__section-title">Stil wählen</div>
                <div className="lt-event-card__gen-btns">
                  {TICKER_STYLES.map((s) => (
                    <button
                      key={s}
                      className="lt-event-card__gen-btn"
                      onClick={() => onGenerate(selectedEvent.id, s)}
                      disabled={generatingId === selectedEvent.id}
                    >
                      {generatingId === selectedEvent.id ? "…" : `✦ ${s}`}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── MANUAL ──────────────────────────────────────── */}
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

        {/* ── ScorePlay Bilder ─────────────────────────── */}
        <div style={{ marginTop: "1rem" }}>
          <MediaPickerPanel match={match} matchId={match.id} playerNames={playerNames} currentMinute={currentMinute} lineups={lineups} />
        </div>

        {/* ── Tor-Clips ────────────────────────────────── */}
        <div style={{ marginTop: "0.5rem" }}>
          <ClipPickerPanel matchId={match.id} match={match} currentMinute={currentMinute} onPublished={() => reload.loadTickerTexts()} />
        </div>

        {/* ── YouTube / X / Instagram – nur bei Team-Spielen ── */}
        {isOurTeam && (<>
          <div style={{ marginTop: "0.5rem" }}>
            <YouTubePanel matchId={match.id} currentMinute={currentMinute} />
          </div>
          <div style={{ marginTop: "0.5rem" }}>
            <TwitterPanel matchId={match.id} currentMinute={currentMinute} />
          </div>
          <div style={{ marginTop: "0.5rem" }}>
            <InstagramPanel matchId={match.id} currentMinute={currentMinute} />
          </div>
        </>)}
      </div>
    </div>
  );
});

function CollapsibleSection({ title, count, actions, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: "1rem" }}>
      <div
        className="lt-center__section-title"
        style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{title}{count != null ? ` (${count})` : ""}</span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }} onClick={(e) => e.stopPropagation()}>
          {actions}
          <span style={{ fontSize: "0.65rem", opacity: 0.5, pointerEvents: "none" }}>{open ? "▲" : "▼"}</span>
        </div>
      </div>
      {open && children}
    </div>
  );
}

function SummaryDraftCard({ draft, label = "KI-Text", onPublish, onReject }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(draft.text ?? "");
  return (
    <div className="lt-draft" style={{ marginBottom: "0.5rem" }}>
      <div className="lt-draft__header">
        <span style={{ fontSize: "0.9rem" }}>{draft.icon ?? "✦"}</span>
        <span className="lt-draft__label">{label}</span>
      </div>
      <div className="lt-draft__text-wrap">
        {editing ? (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            className="lt-entry__edit-textarea"
            autoFocus
            style={{ width: "100%", marginBottom: "0.5rem" }}
          />
        ) : (
          <p className="lt-draft__text" style={{ cursor: "text" }} onClick={() => setEditing(true)} title="Klicken zum Bearbeiten">
            {text || "Generiere Text…"}
          </p>
        )}
      </div>
      <div className="lt-draft__actions">
        <button className="lt-btn lt-btn--primary" onClick={() => onPublish(text)}>
          Annehmen <kbd className="lt-btn__kbd">TAB</kbd>
        </button>
        <button className="lt-btn lt-btn--ghost" onClick={onReject}>
          Ablehnen <kbd className="lt-btn__kbd">ESC</kbd>
        </button>
        <button className="lt-btn lt-btn--ghost" onClick={() => setEditing((v) => !v)}>
          {editing ? "✓ Fertig" : "✎ Bearbeiten"}
        </button>
      </div>
    </div>
  );
}

CenterPanel.propTypes = {
  match: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    homeTeam: PropTypes.shape({ name: PropTypes.string }),
    awayTeam: PropTypes.shape({ name: PropTypes.string }),
  }),
  currentMinute: PropTypes.number,
  events: PropTypes.array.isRequired,
  tickerTexts: PropTypes.array.isRequired,
  generatingId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onGenerate: PropTypes.func.isRequired,
  onManualPublish: PropTypes.func.isRequired,
  onDraftActive: PropTypes.func,
  onPublished: PropTypes.func,
  reload: PropTypes.shape({
    loadTickerTexts: PropTypes.func.isRequired,
  }).isRequired,
  instance: PropTypes.string,
  lineups: PropTypes.array,
  players: PropTypes.array,
};

const EventCard = memo(function EventCard({
  event,
  draft,
  isSelected,
  generatingId,
  onGenerate,
  onSelect,
  onDismiss,
  showGenButtons,
}) {
  const { icon, cssClass } = getEventMeta(event.liveTickerEventType, null);
  const [confirmDismiss, setConfirmDismiss] = useState(false);

  return (
    <div
      className={`lt-event-card lt-event-card--${cssClass}${isSelected ? " lt-event-card--selected" : ""}`}
      onClick={onSelect}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
    >
      <div className="lt-event-card__row">
        <span className="lt-event-card__minute">{event.time}'</span>
        <span className="lt-event-card__icon">{icon}</span>
        <span className="lt-event-card__raw">
          {draft?.text ?? getRawEventText(event)}
        </span>
        {onDismiss && !confirmDismiss && (
          <button
            onClick={(e) => { e.stopPropagation(); setConfirmDismiss(true); }}
            title="Entfernen"
            style={{ marginLeft: "auto", flexShrink: 0, background: "none", border: "none", color: "var(--lt-text-faint)", cursor: "pointer", fontSize: "0.75rem", padding: "0 2px", opacity: 0.5 }}
          >✕</button>
        )}
        {confirmDismiss && (
          <div className="lt-delete-confirm" style={{ marginLeft: "auto" }} onClick={(e) => e.stopPropagation()}>
            <span className="lt-delete-confirm__label">Entfernen?</span>
            <button className="lt-delete-confirm__btn lt-delete-confirm__btn--ok" onClick={() => { onDismiss(); setConfirmDismiss(false); }}>Ja</button>
            <button className="lt-delete-confirm__btn lt-delete-confirm__btn--cancel" onClick={() => setConfirmDismiss(false)}>Nein</button>
          </div>
        )}
      </div>

      {showGenButtons && !draft && (
        <div className="lt-event-card__gen-btns">
          {TICKER_STYLES.map((s) => (
            <button
              key={s}
              className="lt-event-card__gen-btn"
              onClick={(e) => {
                e.stopPropagation();
                onGenerate(event.id, s);
              }}
              disabled={generatingId === event.id}
            >
              {generatingId === event.id ? "…" : `✦ ${s}`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

EventCard.propTypes = {
  event: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    time: PropTypes.number,
    liveTickerEventType: PropTypes.string,
  }).isRequired,
  draft: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    text: PropTypes.string,
  }),
  isSelected: PropTypes.bool,
  generatingId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onGenerate: PropTypes.func.isRequired,
  onSelect: PropTypes.func,
  onDismiss: PropTypes.func,
  showGenButtons: PropTypes.bool.isRequired,
};
