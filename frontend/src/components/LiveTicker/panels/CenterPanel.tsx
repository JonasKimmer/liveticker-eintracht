import { useState, useEffect, memo, useMemo } from "react";
import { AutoModePanel } from "../components/mode/AutoModePanel";
import { CollapsibleSection } from "../components/Collapsible";
import { EntryEditor } from "../components/entry/EntryEditor";
import { EventCard } from "../components/entry/EventCard";
import { SummaryDraftCard } from "../components/summary/SummaryDraftCard";
import { MediaPickerPanel } from "../components/media/MediaPickerPanel";
import { SummarySection } from "../components/summary/SummarySection";
import { PublishedSummarySection } from "../components/summary/PublishedSummarySection";
import { StatsDraftSection } from "../components/summary/StatsDraftSection";
import { YouTubePanel } from "../components/social/YouTubePanel";
import { TwitterPanel } from "../components/social/TwitterPanel";
import { InstagramPanel } from "../components/social/InstagramPanel";
import { MODES, AUTO_ERROR_TIMEOUT_MS, STATS_ENTRY_ICON } from "../constants";
import { useTickerModeContext } from "context/TickerModeContext";
import { useTickerDataContext } from "context/TickerDataContext";
import { useTickerActionsContext } from "context/TickerActionsContext";
import { useAutoPublisher } from "../hooks/useAutoPublisher";
import { useBulkActions } from "../hooks/useBulkActions";
import { useEventDraft } from "../hooks/useEventDraft";
import * as api from "api";
import config from "config/whitelabel";
import { isOurTeamMatch } from "utils/isOurTeamMatch";
import type { LineupEntry, Player } from "../../../types";

interface CenterPanelProps {
  currentMinute?: number;
  instance?: string;
  lineups: LineupEntry[];
  players: Player[];
  language?: string;
  tickerMode?: string;
}

export const CenterPanel = memo<CenterPanelProps>(function CenterPanel({
  currentMinute = 0,
  instance = "ef_whitelabel",
  lineups = [],
  players = [],
  language = "de",
  tickerMode = "coop",
}: CenterPanelProps) {
  const { mode } = useTickerModeContext();
  const { match, tickerTexts, generatingId, reload } = useTickerDataContext();
  const { onPublished } = useTickerActionsContext();

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
    const teamNames = [match?.homeTeam?.name, match?.awayTeam?.name].filter(
      Boolean,
    );
    return [...new Set([...fromPlayers, ...teamNames])];
  }, [lineups, players, match]);

  const isOurTeam = useMemo(
    () => isOurTeamMatch(match, config.teamKeyword ?? ""),
    [match],
  );

  const hasPendingSummaries = useMemo(
    () =>
      tickerTexts.some(
        (t) =>
          t.status === "draft" &&
          !t.event_id &&
          !t.video_url &&
          t.icon !== STATS_ENTRY_ICON,
      ),
    [tickerTexts],
  );

  const [selectedSummaryDraftId, setSelectedSummaryDraftId] = useState<number | null>(null);
  const [pendingAutoExpandId, setPendingAutoExpandId] = useState<number | null>(null);
  const [autoError, setAutoError] = useState<string | null>(null);

  const {
    pendingEvents,
    selectedEvent,
    setSelectedEventId,
    editorValue,
    setEditorValue,
    handleDismissEvent,
    handleRegenerateEventDraft,
    handleRejectDraft,
    handleManualPublish,
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
  } = useBulkActions({ instance, language, tickerMode, pendingEvents, setSelectedSummaryDraftId });

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
      (t) =>
        t.id === pendingAutoExpandId && t.status === "draft" && !t.event_id,
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

            <StatsDraftSection
              selectedId={selectedSummaryDraftId}
              onSelect={setSelectedSummaryDraftId}
            />

            <PublishedSummarySection onRetract={setPendingAutoExpandId} />

            {/* Events */}
            {pendingEvents.length === 0 && !hasPendingSummaries && (
              <div className="lt-empty">
                <div className="lt-empty__icon">✓</div>
                Alle Events verarbeitet
              </div>
            )}

            {pendingEvents.length > 0 && (
              <CollapsibleSection
                title="Events"
                count={pendingEvents.length}
                onToggle={(open) => {
                  if (!open) setSelectedEventId(null);
                }}
                actions={
                  pendingEvents.length > 1 ? (
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      {pendingEvents.some((ev) =>
                        tickerTexts.find(
                          (t) =>
                            t.event_id === ev.id && t.status !== "published",
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
                {pendingEvents
                  .slice()
                  .sort((a, b) => (a.time ?? 0) - (b.time ?? 0))
                  .map((ev) => {
                  const draft = tickerTexts.find((t) => t.event_id === ev.id && t.status !== "deleted");
                  const isSelected = selectedEvent?.id === ev.id;
                  return (
                    <div key={ev.id}>
                      <EventCard
                        event={ev}
                        draft={draft}
                        isSelected={isSelected}
                        onSelect={() => {
                          setSelectedEventId(ev.id);
                        }}
                        onDismiss={() => handleDismissEvent(ev, draft)}
                      />
                      {isSelected && draft && (
                        <SummaryDraftCard
                          draft={draft}
                          label={ev.liveTickerEventType}
                          onPublish={(text) => {
                            api.publishTicker(draft.id, text).then(() => reload.loadTickerTexts());
                          }}
                          onReject={handleRejectDraft}
                          onGenerate={(_, style) => handleRegenerateEventDraft(ev.id, style)}
                          generatingId={generatingId}
                        />
                      )}
                      {isSelected && !draft && (
                        <SummaryDraftCard
                          draft={{ id: -1, text: "", status: "draft" as const, event_id: ev.id } as any}
                          label={ev.liveTickerEventType}
                          onPublish={() => {}}
                          onReject={() => setSelectedEventId(null)}
                          onGenerate={(_, style) => handleRegenerateEventDraft(ev.id, style)}
                          generatingId={generatingId}
                        />
                      )}
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
              <InstagramPanel
                matchId={match.id}
                currentMinute={currentMinute}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
});

// match, events, tickerTexts, reload → via TickerDataContext
// onGenerate, onManualPublish, onDraftActive, onPublished → via TickerActionsContext
