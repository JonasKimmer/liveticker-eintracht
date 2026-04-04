import { useState, useEffect, memo, useMemo } from "react";
import { AIDraft } from "../components/entry/AIDraft";
import { AutoModePanel } from "../components/mode/AutoModePanel";
import { CollapsibleSection } from "../components/Collapsible";
import { EntryEditor } from "../components/entry/EntryEditor";
import { EventCard } from "../components/entry/EventCard";
import { AutoPlayVideo } from "../components/AutoPlayVideo";
import { MediaPickerPanel } from "../components/media/MediaPickerPanel";
import { ClipPickerPanel } from "../components/media/ClipPickerPanel";
import { SummarySection } from "../components/summary/SummarySection";
import { PublishedSummarySection } from "../components/summary/PublishedSummarySection";
import { YouTubePanel } from "../components/social/YouTubePanel";
import { TwitterPanel } from "../components/social/TwitterPanel";
import { InstagramPanel } from "../components/social/InstagramPanel";
import { MODES, AUTO_ERROR_TIMEOUT_MS } from "../constants";
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

  const videoDrafts = useMemo(
    () => tickerTexts.filter((t) => t.status === "draft" && !t.event_id && !!t.video_url),
    [tickerTexts],
  );

  const hasPendingSummaries = useMemo(
    () => tickerTexts.some((t) => t.status === "draft" && !t.event_id && !t.video_url),
    [tickerTexts],
  );

  const [selectedSummaryDraftId, setSelectedSummaryDraftId] = useState<number | null>(null);
  const [selectedVideoDraftId, setSelectedVideoDraftId] = useState<number | null>(null);
  const [pendingAutoExpandId, setPendingAutoExpandId] = useState<number | null>(null);
  const [autoError, setAutoError] = useState<string | null>(null);

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

            <PublishedSummarySection onRetract={setPendingAutoExpandId} />

            {/* Events */}
            {pendingEvents.length === 0 && videoDrafts.length === 0 && !hasPendingSummaries && (
              <div className="lt-empty">
                <div className="lt-empty__icon">✓</div>
                Alle Events verarbeitet
              </div>
            )}

            {(pendingEvents.length > 0 || videoDrafts.length > 0) && (
              <CollapsibleSection
                title="Events"
                count={pendingEvents.length + videoDrafts.length}
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
                {[
                  ...videoDrafts.map((d) => ({ type: "video" as const, minute: d.minute ?? 0, item: d })),
                  ...pendingEvents.map((ev) => ({ type: "event" as const, minute: ev.time ?? 0, item: ev })),
                ]
                  .sort((a, b) => a.minute - b.minute)
                  .map(({ type, item }) => {
                  if (type === "video") {
                    const draft = item;
                    const isVideoSelected = selectedVideoDraftId === draft.id;
                    return (
                      <div key={`video-${draft.id}`}>
                        <div
                          className={`lt-event-card lt-event-card__summary--video${isVideoSelected ? " lt-event-card--selected" : ""}`}
                          onClick={() => setSelectedVideoDraftId(isVideoSelected ? null : draft.id)}
                          role="button"
                          tabIndex={0}
                        >
                          <div className="lt-event-card__row">
                            <span className="lt-event-card__minute">{draft.minute ? `${draft.minute}'` : ""}</span>
                            <span className="lt-event-card__icon">🎬</span>
                            <span className="lt-event-card__raw">Jubelvideo</span>
                          </div>
                        </div>
                        {isVideoSelected && (
                          <div
                            style={{
                              background: "var(--lt-surface)",
                              borderRadius: 8,
                              padding: "0.75rem",
                              border: "1px solid var(--lt-border)",
                              marginBottom: "0.5rem",
                            }}
                          >
                            {draft.video_url && (
                              <AutoPlayVideo
                                src={draft.video_url}
                                style={{ width: "100%", borderRadius: 6, marginBottom: "0.5rem", maxHeight: 220 }}
                              />
                            )}
                            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                              <button
                                className="lt-event-card__gen-btn"
                                style={{ flex: 1, background: "rgba(34,197,94,0.15)", color: "#4ade80" }}
                                onClick={async () => {
                                  await api.updateTicker(draft.id, { status: "published" });
                                  await reload.loadTickerTexts();
                                  onPublished?.(draft.id, draft.text || "🎬 Jubelvideo");
                                }}
                              >
                                ✓ Veröffentlichen
                              </button>
                              <button
                                className="lt-event-card__gen-btn"
                                style={{ flex: 1, background: "rgba(239,68,68,0.1)", color: "#f87171" }}
                                onClick={async () => {
                                  await api.updateTicker(draft.id, { status: "rejected" });
                                  await reload.loadTickerTexts();
                                }}
                              >
                                ✕ Ablehnen
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }
                  const ev = item;
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
