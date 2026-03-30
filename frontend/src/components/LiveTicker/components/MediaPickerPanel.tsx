// ============================================================
// MediaPickerPanel.jsx — ScorePlay Bilder für Redakteure
// Design: lt- CSS-Variablen (passt zum bestehenden System)
// Flow: Bilder laden → Doppelklick → Modal → Veröffentlichen
// ============================================================

import { useState, useCallback, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useMediaWebSocket } from "hooks/useMediaWebSocket";
import { fetchMediaQueue, clearMediaQueue } from "api";
import { MediaThumbnail } from "./MediaThumbnail";
import { MediaPublishModal } from "./MediaPublishModal";
import config from "config/whitelabel";

const N8N_WEBHOOK = `${config.n8nBase}/scoreplay-media`;

// ── API ──────────────────────────────────────────────────────

async function triggerN8nWebhook(player) {
  const body = player
    ? { player_id: player.playerId, jersey_number: player.jerseyNumber, player_name: player.playerName }
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
  match?: { homeTeam?: { name: string } | null; awayTeam?: { name: string } | null; teamHomeId?: number; teamAwayId?: number } | null;
  matchId: number;
  defaultOpen?: boolean;
  playerNames?: string[];
  currentMinute?: number;
  lineups?: { playerId?: number; playerName?: string | null; jerseyNumber?: number | null; teamId?: number }[];
}

export function MediaPickerPanel({ match, matchId, defaultOpen = false, playerNames = [], currentMinute = 0, lineups = [] }: MediaPickerPanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [images, setImages] = useState([]);
  const [modalImage, setModalImage] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [playerQuery, setPlayerQuery] = useState("");
  const [loadingTrigger, setLoadingTrigger] = useState(false);

  // Eintracht-Spieler aus dem Lineup (Heim oder Auswärts), sortiert nach Trikot#
  const eintrachtTeamId = useMemo(() => {
    if (!match) return null;
    if (match?.homeTeam?.name?.toLowerCase().includes(config.teamKeyword)) return match.teamHomeId;
    if (match?.awayTeam?.name?.toLowerCase().includes(config.teamKeyword)) return match.teamAwayId;
    return null;
  }, [match]);
  const lineupPlayers = useMemo(() => {
    return [...lineups]
      .filter((l) => l.playerName && (!eintrachtTeamId || l.teamId === eintrachtTeamId))
      .sort((a, b) => (a.jerseyNumber ?? 99) - (b.jerseyNumber ?? 99));
  }, [lineups, eintrachtTeamId]);
  const [statusMsg, setStatusMsg] = useState(null);

  // Spieler-Vorschläge für Suche (memoized)
  const playerSuggestions = useMemo(() => {
    if (!playerQuery || selectedPlayer) return [];
    const q = playerQuery.toLowerCase();
    return lineupPlayers.filter((p) =>
      p.playerName?.toLowerCase().includes(q) ||
      String(p.jerseyNumber ?? "").startsWith(q)
    ).slice(0, 8);
  }, [playerQuery, selectedPlayer, lineupPlayers]);

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
      try { await clearMediaQueue(); } catch (_) {}
    }
    try {
      await triggerN8nWebhook(selectedPlayer);
      setStatusMsg({ type: "success", text: "Workflow gestartet – Bilder erscheinen gleich..." });
      setTimeout(async () => { try { setImages((await fetchMediaQueue()).data); } catch (_) {} }, 4000);
    } catch (e) {
      setStatusMsg({ type: "error", text: e.message });
    } finally {
      setLoadingTrigger(false);
    }
  }, [selectedPlayer]);

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

  // Spin-Keyframe (einmalig via style-Tag)
  useEffect(() => {
    if (document.getElementById("lt-spin-keyframe")) return;
    const style = document.createElement("style");
    style.id = "lt-spin-keyframe";
    style.textContent = "@keyframes spin { to { transform: rotate(360deg); } }";
    document.head.appendChild(style);
  }, []);

  // Nur bei Team-Spielen anzeigen (Heim oder Auswärts)
  const isEintracht = match?.homeTeam?.name?.toLowerCase().includes(config.teamKeyword) ||
    match?.awayTeam?.name?.toLowerCase().includes(config.teamKeyword);
  if (match && !isEintracht) return null;

  return (
    <>
      {modalImage && createPortal(
        <MediaPublishModal
          image={modalImage}
          matchId={matchId}
          onClose={() => setModalImage(null)}
          onPublished={handlePublished}
          playerNames={playerNames}
          currentMinute={currentMinute}
        />,
        document.body
      )}

      <div style={{
        borderRadius: 8,
        border: "1px solid var(--lt-border)",
        background: "var(--lt-bg-card)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <button
          onClick={() => setOpen((v) => !v)}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "0.65rem 1rem", background: "transparent", border: "none", cursor: "pointer",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = "var(--lt-bg-hover)"}
          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontFamily: "var(--lt-font-mono)", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--lt-text-muted)" }}>
            <span>📷</span>
            <span>Bilder</span>
            {images.length > 0 && (
              <span style={{
                background: "var(--lt-accent)", color: "#0d0d0d",
                fontSize: "0.6rem", fontWeight: 700, borderRadius: 4,
                padding: "1px 6px", lineHeight: 1.4,
              }}>
                {images.length}
              </span>
            )}
          </span>
          <svg
            style={{ width: 14, height: 14, color: "var(--lt-text-faint)", transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div style={{ padding: "0.75rem 1rem 1rem", borderTop: "1px solid var(--lt-border)", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {/* Status */}
            {statusMsg && (
              <div className={`lt-status-msg ${statusMsg.type === "error" ? "lt-status-msg--error" : "lt-status-msg--success"}`}>
                {statusMsg.text}
              </div>
            )}

            {/* Spieler-Suche */}
            {lineupPlayers.length > 0 && (
              <div style={{ position: "relative" }}>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    placeholder="# oder Name suchen…"
                    value={playerQuery}
                    onChange={(e) => { setPlayerQuery(e.target.value); if (selectedPlayer) setSelectedPlayer(null); }}
                    onKeyDown={(e) => { if (e.key === "Escape") { setPlayerQuery(""); setSelectedPlayer(null); } }}
                    style={{
                      width: "100%", boxSizing: "border-box",
                      background: "var(--lt-bg-input)", border: `1px solid ${selectedPlayer ? "var(--lt-accent)" : "var(--lt-border)"}`,
                      borderRadius: 6, padding: "0.4rem 2rem 0.4rem 0.65rem",
                      fontFamily: "var(--lt-font-mono)", fontSize: "0.75rem",
                      color: "var(--lt-text)", outline: "none",
                    }}
                  />
                  {selectedPlayer ? (
                    <button
                      onClick={() => { setSelectedPlayer(null); setPlayerQuery(""); }}
                      style={{
                        position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
                        background: "none", border: "none", cursor: "pointer",
                        color: "var(--lt-text-muted)", fontSize: "0.7rem", padding: 0, lineHeight: 1,
                      }}
                    >✕</button>
                  ) : playerQuery && (
                    <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "var(--lt-text-faint)", fontSize: "0.65rem", pointerEvents: "none" }}>↵</span>
                  )}
                </div>

                {/* Vorschläge */}
                {playerSuggestions.length > 0 && (
                  <div style={{
                    position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50,
                    background: "var(--lt-bg-card)", border: "1px solid var(--lt-border)",
                    borderRadius: 6, overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                  }}>
                    {playerSuggestions.map((p) => (
                      <button
                        key={p.playerId ?? p.jerseyNumber}
                        onMouseDown={(e) => { e.preventDefault(); setSelectedPlayer(p); setPlayerQuery(p.jerseyNumber != null ? `#${p.jerseyNumber} ${p.playerName}` : p.playerName); }}
                        style={{
                          width: "100%", display: "flex", alignItems: "center", gap: "0.5rem",
                          padding: "0.4rem 0.65rem", background: "transparent", border: "none",
                          cursor: "pointer", textAlign: "left",
                          borderBottom: "1px solid var(--lt-border)",
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "var(--lt-bg-card-2)"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                      >
                        {p.jerseyNumber != null && (
                          <span style={{
                            fontFamily: "var(--lt-font-mono)", fontSize: "0.68rem", fontWeight: 700,
                            color: "var(--lt-accent)", minWidth: 22, textAlign: "right",
                          }}>
                            {p.jerseyNumber}
                          </span>
                        )}
                        <span style={{ fontFamily: "var(--lt-font-mono)", fontSize: "0.75rem", color: "var(--lt-text)" }}>
                          {p.playerName}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Laden-Button */}
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={handleLoadImages}
                disabled={loadingTrigger}
                style={{
                  flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "0.45rem 0.85rem", borderRadius: 6, border: "none",
                  background: loadingTrigger ? "var(--lt-bg-card-2)" : "var(--lt-accent)",
                  color: loadingTrigger ? "var(--lt-text-faint)" : "#0d0d0d",
                  fontFamily: "var(--lt-font-mono)", fontSize: "0.75rem", fontWeight: 700,
                  cursor: loadingTrigger ? "not-allowed" : "pointer", transition: "all 0.15s",
                }}
              >
                {loadingTrigger ? (
                  <svg style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }} />
                    <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" style={{ opacity: 0.75 }} />
                  </svg>
                ) : "↓"}
                {loadingTrigger ? "Lädt..." : "Bilder laden"}
              </button>
            </div>

            {/* Grid */}
            {images.length === 0 ? (
              <p style={{ textAlign: "center", padding: "1.5rem 0", fontFamily: "var(--lt-font-mono)", fontSize: "0.72rem", color: "var(--lt-text-faint)" }}>
                Keine Bilder in der Queue
              </p>
            ) : (
              <>
                <p style={{ fontFamily: "var(--lt-font-mono)", fontSize: "0.62rem", color: "var(--lt-text-faint)", letterSpacing: "0.04em", margin: 0 }}>
                  Doppelklick zum Veröffentlichen
                </p>
                <div className="lt-grid-2">
                  {images.map((img) => (
                    <MediaThumbnail key={img.media_id} item={img} onDoubleClick={setModalImage} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}

