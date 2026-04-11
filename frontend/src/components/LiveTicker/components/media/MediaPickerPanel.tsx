// ============================================================
// MediaPickerPanel.tsx — ScorePlay Bilder für Redakteure
// Design: lt- CSS-Variablen (passt zum bestehenden System)
// Flow: Bilder laden → Doppelklick → Modal → Veröffentlichen
// ============================================================

import { useState, useCallback, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useMediaWebSocket } from "../../hooks/useMediaWebSocket";
import { fetchMediaQueue, clearMediaQueue } from "api";
import { PickerPanelShell } from "../PickerPanelShell";
import { MediaThumbnail } from "./MediaThumbnail";
import { MediaPublishModal } from "./MediaPublishModal";
import { useListKeyboard } from "hooks/useListKeyboard";
import config from "config/whitelabel";

const N8N_WEBHOOK = `${config.n8nBase}/scoreplay-media`;

// ── Lokale Typen ──────────────────────────────────────────────

type StatusMsg = { type: "error" | "success"; text: string };

interface MediaQueueItem {
  media_id: string | number;
  thumbnail_url?: string | null;
  name?: string | null;
}

interface LineupPlayer {
  playerId?: number;
  playerName?: string | null;
  jerseyNumber?: number | null;
  teamId?: number;
}

// ── API ──────────────────────────────────────────────────────

async function triggerN8nWebhook(player: LineupPlayer | null) {
  const body = player
    ? {
        player_id: player.playerId,
        jersey_number: player.jerseyNumber,
        player_name: player.playerName,
      }
    : {};
  const res = await fetch(N8N_WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`n8n Webhook fehlgeschlagen (${res.status})`);
}

// ── Hauptkomponente ───────────────────────────────────────────

interface MediaPickerPanelProps {
  match?: {
    homeTeam?: { name: string } | null;
    awayTeam?: { name: string } | null;
    teamHomeId?: number;
    teamAwayId?: number;
  } | null;
  matchId: number;
  defaultOpen?: boolean;
  playerNames?: string[];
  currentMinute?: number;
  lineups?: {
    playerId?: number;
    playerName?: string | null;
    jerseyNumber?: number | null;
    teamId?: number;
  }[];
}

export function MediaPickerPanel({
  match,
  matchId,
  defaultOpen = false,
  playerNames = [],
  currentMinute = 0,
  lineups = [],
}: MediaPickerPanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [images, setImages] = useState<MediaQueueItem[]>([]);
  const [modalImage, setModalImage] = useState<MediaQueueItem | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<LineupPlayer | null>(null);
  const [playerQuery, setPlayerQuery] = useState("");
  const [loadingTrigger, setLoadingTrigger] = useState(false);

  // Eintracht-Spieler aus dem Lineup (Heim oder Auswärts), sortiert nach Trikot#
  const eintrachtTeamId = useMemo(() => {
    if (!match) return null;
    if (match?.homeTeam?.name?.toLowerCase().includes(config.teamKeyword))
      return match.teamHomeId;
    if (match?.awayTeam?.name?.toLowerCase().includes(config.teamKeyword))
      return match.teamAwayId;
    return null;
  }, [match]);
  const lineupPlayers = useMemo(() => {
    return [...lineups]
      .filter(
        (l) =>
          l.playerName && (!eintrachtTeamId || l.teamId === eintrachtTeamId),
      )
      .sort((a, b) => (a.jerseyNumber ?? 99) - (b.jerseyNumber ?? 99));
  }, [lineups, eintrachtTeamId]);
  const [statusMsg, setStatusMsg] = useState<StatusMsg | null>(null);

  // Spieler-Vorschläge für Suche (memoized)
  const playerSuggestions = useMemo(() => {
    if (!playerQuery || selectedPlayer) return [];
    const q = playerQuery.toLowerCase();
    return lineupPlayers
      .filter(
        (p) =>
          p.playerName?.toLowerCase().includes(q) ||
          String(p.jerseyNumber ?? "").startsWith(q),
      )
      .slice(0, 8);
  }, [playerQuery, selectedPlayer, lineupPlayers]);

  const selectSuggestion = useCallback((p: LineupPlayer) => {
    setSelectedPlayer(p);
    setPlayerQuery(
      p.jerseyNumber != null
        ? `#${p.jerseyNumber} ${p.playerName}`
        : (p.playerName ?? ""),
    );
  }, []);

  const { activeIdx, onKeyDown: listKeyDown } = useListKeyboard(playerSuggestions, {
    onSelect: selectSuggestion,
    onClose: () => { setPlayerQuery(""); setSelectedPlayer(null); },
  });

  useEffect(() => {
    if (!open) return;
    fetchMediaQueue()
      .then((res) => setImages(res.data))
      .catch((e) => setStatusMsg({ type: "error", text: e.message }));
  }, [open]);

  const handleNewMedia = useCallback((newItems) => {
    setImages((prev) => {
      const ids = new Set(prev.map((img) => img.media_id));
      const fresh = newItems.filter((i) => !ids.has(i.media_id));
      return fresh.length ? [...fresh, ...prev] : prev;
    });
  }, []);

  useMediaWebSocket(handleNewMedia, open);

  const handleLoadImages = useCallback(async () => {
    setLoadingTrigger(true);
    setStatusMsg(null);
    if (selectedPlayer) {
      setImages([]);
      try {
        await clearMediaQueue();
      } catch (_) {}
    }
    try {
      await triggerN8nWebhook(selectedPlayer);
      setStatusMsg({
        type: "success",
        text: "Workflow gestartet – Bilder erscheinen gleich...",
      });
      setTimeout(async () => {
        try {
          setImages((await fetchMediaQueue()).data);
        } catch (_) {}
      }, 4000);
    } catch (e) {
      setStatusMsg({ type: "error", text: e.message });
    } finally {
      setLoadingTrigger(false);
    }
  }, [selectedPlayer]);

  const handleRefresh = useCallback(async () => {
    try {
      const res = await fetchMediaQueue();
      setImages(res.data);
    } catch (e) {
      setStatusMsg({ type: "error", text: e.message });
    }
  }, []);

  const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && selectedPlayer && playerSuggestions.length === 0) {
      e.preventDefault();
      handleLoadImages();
      return;
    }
    listKeyDown(e);
  }, [selectedPlayer, playerSuggestions.length, listKeyDown, handleLoadImages]);

  const handlePublished = useCallback((mediaId) => {
    setImages((prev) => prev.filter((img) => img.media_id !== mediaId));
    setModalImage(null);
    setStatusMsg({ type: "success", text: "✓ Im Liveticker veröffentlicht!" });
  }, []);

  // Auto-dismiss Status-Meldung nach 3s
  useEffect(() => {
    if (!statusMsg || statusMsg.type !== "success") return;
    const id = setTimeout(() => setStatusMsg(null), 3000);
    return () => clearTimeout(id);
  }, [statusMsg]);

  // Nur bei Team-Spielen anzeigen (Heim oder Auswärts)
  const isEintracht =
    match?.homeTeam?.name?.toLowerCase().includes(config.teamKeyword) ||
    match?.awayTeam?.name?.toLowerCase().includes(config.teamKeyword);
  if (match && !isEintracht) return null;

  return (
    <>
      {modalImage &&
        createPortal(
          <MediaPublishModal
            image={modalImage}
            matchId={matchId}
            onClose={() => setModalImage(null)}
            onPublished={handlePublished}
            playerNames={playerNames}
            currentMinute={currentMinute}
          />,
          document.body,
        )}

      <PickerPanelShell
        open={open}
        onToggle={() => setOpen((v) => !v)}
        icon="📷"
        label="Bilder"
        badgeCount={images.length}
        badgeBackground="var(--lt-accent)"
        importing={loadingTrigger}
        loading={false}
        onImport={handleLoadImages}
        onRefresh={handleRefresh}
        importLabel="↓ Bilder laden"
        importingLabel="Lädt..."
        importBackground="var(--lt-accent)"
        emptyLabel="Keine Bilder in der Queue"
        hintLabel="Doppelklick zum Veröffentlichen"
        statusMsg={statusMsg}
      >
        {/* Spieler-Suche */}
        {lineupPlayers.length > 0 && (
          <div style={{ gridColumn: "1 / -1", position: "relative" }}>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                className="lt-entry-editor__input"
                placeholder="# oder Name suchen…"
                value={playerQuery}
                onChange={(e) => {
                  setPlayerQuery(e.target.value);
                  if (selectedPlayer) setSelectedPlayer(null);
                }}
                onKeyDown={handleInputKeyDown}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  border: `1px solid ${selectedPlayer ? "var(--lt-accent)" : "var(--lt-border)"}`,
                  padding: "0.4rem 2rem 0.4rem 0.65rem",
                }}
              />
              {selectedPlayer ? (
                <button
                  onClick={() => { setSelectedPlayer(null); setPlayerQuery(""); }}
                  style={{
                    position: "absolute", right: 6, top: "50%",
                    transform: "translateY(-50%)", background: "none",
                    border: "none", cursor: "pointer",
                    color: "var(--lt-text-muted)", fontSize: "0.7rem",
                    padding: 0, lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              ) : (
                playerQuery && (
                  <span style={{
                    position: "absolute", right: 8, top: "50%",
                    transform: "translateY(-50%)", color: "var(--lt-text-faint)",
                    fontSize: "0.65rem", pointerEvents: "none",
                  }}>
                    ↵
                  </span>
                )
              )}
            </div>

            {/* Vorschläge */}
            {playerSuggestions.length > 0 && (
              <div className="lt-cmd-palette" style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50 }}>
                {playerSuggestions.map((p, i) => (
                  <button
                    key={p.playerId ?? p.jerseyNumber}
                    className={`lt-cmd-palette__item${i === activeIdx ? " lt-cmd-palette__item--active" : ""}`}
                    onMouseDown={(e) => { e.preventDefault(); selectSuggestion(p); }}
                  >
                    {p.jerseyNumber != null && (
                      <span className="lt-cmd-palette__icon" style={{ fontWeight: 700, color: "var(--lt-text-muted)", minWidth: 22, textAlign: "right" }}>
                        {p.jerseyNumber}
                      </span>
                    )}
                    <span className="lt-cmd-palette__cmd" style={{ color: "var(--lt-text)" }}>{p.playerName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {images.map((img) => (
          <MediaThumbnail
            key={img.media_id}
            item={img}
            onDoubleClick={setModalImage}
          />
        ))}
      </PickerPanelShell>
    </>
  );
}
