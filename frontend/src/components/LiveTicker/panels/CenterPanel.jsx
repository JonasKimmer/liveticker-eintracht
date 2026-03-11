import React, { useState, useEffect, useCallback, useRef, memo, useMemo } from "react";
import { AIDraft } from "../components/AIDraft";
import { EntryEditor } from "../components/EntryEditor";
import { MediaPickerPanel } from "../components/MediaPickerPanel";
import { MODES, TICKER_STYLES } from "../constants";
import { useTickerModeContext } from "../../../context/TickerModeContext";
import { getEventMeta, getRawEventText } from "../utils/parseCommand";
import * as api from "../../../api";

// Welcher Stil im AUTO-Modus verwendet wird
const AUTO_STYLE = TICKER_STYLES[0];

export function CenterPanel({
  match,
  events,
  tickerTexts,
  generatingId,
  onGenerate,
  onManualPublish,
  onDraftActive,
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
  const [publishing, setPublishing] = useState(false); // eslint-disable-line no-unused-vars
  const [bulkGenerating, setBulkGenerating] = useState(false);

  // Set mit Event-IDs die gerade auto-prozessiert werden → kein Doppel-Trigger
  const processingRef = useRef(new Set());

  const pendingEvents = events.filter(
    (ev) =>
      !tickerTexts.find(
        (t) => t.event_id === ev.id && (t.status === "published" || !t.status),
      ),
  );
  const selectedEvent =
    pendingEvents.find((e) => e.id === selectedEventId) ??
    pendingEvents[0] ??
    null;
  const selectedDraft = selectedEvent
    ? tickerTexts.find((t) => t.event_id === selectedEvent.id)
    : null;

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
          .catch((err) => console.error("auto publish failed", err))
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
          .catch((err) => console.error("auto generate+publish failed", err))
          .finally(() => processingRef.current.delete(ev.id));
      }
    }
  }, [mode, pendingEvents, tickerTexts]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Aktiven Draft nach oben melden (CO-OP) ───────────────
  useEffect(() => {
    if (selectedDraft) onDraftActive?.(selectedDraft.id, selectedDraft.text);
    else onDraftActive?.(null, "");
  }, [selectedDraft, onDraftActive]);

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
      console.error("bulkGenerate failed", err);
    } finally {
      setBulkGenerating(false);
    }
  }, [pendingEvents, tickerTexts, match, reload, instance]);

  const handleEditPublish = useCallback(async ({ text } = {}) => {
    const textToPublish = text ?? editorValue.trim();
    if (!selectedDraft || !textToPublish) return;
    setPublishing(true);
    try {
      await api.publishTicker(selectedDraft.id, textToPublish);
      await reload.loadTickerTexts();
      setEditorValue("");
      setEditMode(false);
      setSelectedEventId(null);
    } catch (err) {
      console.error("editPublish failed", err);
    } finally {
      setPublishing(false);
    }
  }, [selectedDraft, editorValue, reload]);

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
            {pendingEvents.length === 0 && (
              <div className="lt-empty">
                <div className="lt-empty__icon">✓</div>
                Alle Events verarbeitet
              </div>
            )}

            {pendingEvents.length > 1 && (
              <div style={{ marginBottom: "1rem" }}>
                <div className="lt-center__section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Events ({pendingEvents.length})</span>
                  {pendingEvents.some((ev) => !tickerTexts.find((t) => t.event_id === ev.id)) && (
                    <button
                      className="lt-event-card__gen-btn"
                      onClick={handleBulkGenerate}
                      disabled={bulkGenerating}
                      title="KI-Texte für alle Events generieren"
                    >
                      {bulkGenerating ? "…" : "✦ Alle generieren & publishen"}
                    </button>
                  )}
                </div>
                {pendingEvents.map((ev) => (
                  <EventCard
                    key={ev.id}
                    event={ev}
                    draft={tickerTexts.find((t) => t.event_id === ev.id)}
                    isSelected={selectedEvent?.id === ev.id}
                    generatingId={generatingId}
                    onGenerate={onGenerate}
                    onSelect={() => {
                      setSelectedEventId(ev.id);
                      setEditMode(false);
                    }}
                    showGenButtons
                  />
                ))}
              </div>
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
                  draftText={
                    selectedDraft?.text ??
                    "Kein Draft vorhanden – generiere einen Stil."
                  }
                  onAccept={async () => {
                    if (!selectedDraft) return;
                    await api.publishTicker(selectedDraft.id, selectedDraft.text);
                    await reload.loadTickerTexts();
                  }}
                  onReject={async () => {
                    if (!selectedDraft) return;
                    await api.deleteTicker(selectedDraft.id);
                    await reload.loadTickerTexts();
                  }}
                  onEdit={() => {
                    setEditorValue(selectedDraft?.text ?? "");
                    setEditMode(true);
                  }}
                  onTextClick={() => {
                    setEditorValue(selectedDraft?.text ?? "");
                    setEditMode(true);
                  }}
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
            onPublish={async ({ text, icon, minute, phase } = {}) => {
              const textToPublish = text ?? editorValue.trim();
              if (!textToPublish) return;
              await onManualPublish(textToPublish, icon, minute, phase);
              setEditorValue("");
            }}
            mode={mode}
            currentMinute={match?.minute ?? 0}
            playerNames={playerNames}
          />
        )}

        {/* ── ScorePlay Bilder ─────────────────────────── */}
        <div style={{ marginTop: "1rem" }}>
          <MediaPickerPanel matchId={match.id} playerNames={playerNames} currentMinute={match?.minute ?? 0} />
        </div>
      </div>
    </div>
  );
}

const EventCard = memo(function EventCard({
  event,
  draft,
  isSelected,
  generatingId,
  onGenerate,
  onSelect,
  showGenButtons,
}) {
  const { icon, cssClass } = getEventMeta(event.liveTickerEventType, null);

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
