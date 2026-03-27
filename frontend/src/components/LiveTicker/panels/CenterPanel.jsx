import { useState, useEffect, memo, useMemo } from "react";
import PropTypes from "prop-types";
import { AIDraft } from "../components/AIDraft";
import { AutoModePanel } from "../components/AutoModePanel";
import { CollapsibleSection } from "../components/CollapsibleSection";
import { EntryEditor } from "../components/EntryEditor";
import { EventCard } from "../components/EventCard";
import { MediaPickerPanel } from "../components/MediaPickerPanel";
import { ClipPickerPanel } from "../components/ClipPickerPanel";
import { SummarySection } from "../components/SummarySection";
import { PublishedSummarySection } from "../components/PublishedSummarySection";
import { YouTubePanel } from "../components/YouTubePanel";
import { TwitterPanel } from "../components/TwitterPanel";
import { InstagramPanel } from "../components/InstagramPanel";
import { MODES, AUTO_ERROR_TIMEOUT_MS } from "../constants";
import { useTickerModeContext } from "../../../context/TickerModeContext";
import { useTickerDataContext } from "../../../context/TickerDataContext";
import { useAutoPublisher } from "../hooks/useAutoPublisher";
import { useBulkActions } from "../hooks/useBulkActions";
import { useEventDraft } from "../hooks/useEventDraft";
import config from "../../../config/whitelabel";

export const CenterPanel = memo(function CenterPanel({
  currentMinute = 0,
  generatingId,
  instance = "ef_whitelabel",
  lineups = [],
  players = [],
}) {
  const { mode } = useTickerModeContext();
  const { match, tickerTexts } = useTickerDataContext();

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

  const isOurTeam = useMemo(
    () =>
      match?.homeTeam?.name?.toLowerCase().includes(config.teamKeyword) ||
      match?.awayTeam?.name?.toLowerCase().includes(config.teamKeyword),
    [match],
  );

  const [selectedSummaryDraftId, setSelectedSummaryDraftId] = useState(null);
  const [pendingAutoExpandId, setPendingAutoExpandId] = useState(null);
  const [autoError, setAutoError] = useState(null);

  const {
    pendingEvents,
    selectedEvent,
    setSelectedEventId,
    editMode,
    setEditMode,
    editorValue,
    setEditorValue,
    handleDismissEvent,
    handleRegenerateEventDraft,
    handleAcceptDraft,
    handleRejectDraft,
    handleOpenEdit,
    handleManualPublish,
    handleEditPublish,
  } = useEventDraft();

  useAutoPublisher({ instance, pendingEvents, onError: setAutoError });

  const {
    bulkGenerating,
    bulkPublishingSection,
    handleBulkPublish,
    handleBulkGenerate,
    handleBulkPublishPrematch,
    handleBulkPublishSpielphase,
    handleRegenerateSummaryDraft,
  } = useBulkActions({ instance, pendingEvents, setSelectedSummaryDraftId });

  // Auto-dismiss AUTO-Modus Fehler nach Timeout
  useEffect(() => {
    if (!autoError) return;
    const id = setTimeout(() => setAutoError(null), AUTO_ERROR_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [autoError]);

  // Auto-Expand nach Stornierung
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
          <AutoModePanel pendingEvents={pendingEvents} autoError={autoError} />
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

            <PublishedSummarySection onRetract={setPendingAutoExpandId} />

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
            onPublished={() => {}} // reload via TickerDataContext polling
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
