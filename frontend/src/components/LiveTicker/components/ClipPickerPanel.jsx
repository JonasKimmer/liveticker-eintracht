// ============================================================
// ClipPickerPanel.jsx — Persistente Tor-Clips aus DB
// Flow: Clips aus DB laden → Klick → Modal mit KI-Entwurf → Ticker
// ============================================================

import { memo, useState, useCallback, useEffect } from "react";
import PropTypes from "prop-types";
import { createPortal } from "react-dom";
import { fetchClips, fetchGoalClips, deleteClip } from "api";
import logger from "utils/logger";
import { VideoOrThumb } from "./VideoOrThumb";
import { ClipThumbnail } from "./ClipThumbnail";
import { ClipPublishModal } from "./ClipPublishModal";

// ── Hauptkomponente ───────────────────────────────────────────

export const ClipPickerPanel = memo(function ClipPickerPanel({ matchId, match, currentMinute = 0, onPublished }) {
  const [open, setOpen] = useState(false);
  const [clips, setClips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [modalClip, setModalClip] = useState(null);
  const [statusMsg, setStatusMsg] = useState(null);
  const [teamFilter, setTeamFilter] = useState("");

  // Clips laden: erst DB, bei leer/Fehler → n8n Fallback
  const loadClips = useCallback(async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetchClips(matchId, teamFilter || undefined);
      const dbClips = res.data ?? [];
      if (dbClips.length > 0) {
        setClips(dbClips);
        setLoading(false);
        return;
      }
    } catch { /* DB nicht erreichbar → n8n Fallback */ }

    // Fallback: direkt von n8n laden (alter Workflow oder DB noch leer)
    try {
      const res = await fetchGoalClips(matchId);
      const raw = res.data;
      const list = Array.isArray(raw) ? raw : (raw?.items ?? []);
      const n8nClips = list.map((item, i) => ({
        id: `n8n_${i}`,
        vid: item?.json?.vid ?? item?.vid,
        video_url: item?.json?.vid ? `https://cdn.jwplayer.com/players/${item.json.vid}.html` : (item?.videoUrl ?? ""),
        thumbnail_url: item?.json?.thumbnail ?? item?.thumbnail,
        player_name: item?.json?.player ?? item?.player ?? item?.title,
        title: item?.json?.player ?? item?.player ?? item?.title,
        team_name: null,
        published: false,
        _fromN8n: true,
      }));
      setClips(n8nClips);
      if (n8nClips.length > 0) {
        setStatusMsg({ type: "success", text: "Clips aus n8n geladen – Backend neu starten um DB zu aktivieren" });
      }
    } catch {
      setStatusMsg({ type: "error", text: "Keine Clips gefunden." });
    } finally {
      setLoading(false);
    }
  }, [matchId, teamFilter]);

  // Clips laden wenn Panel aufgeht
  useEffect(() => {
    if (!open) return;
    loadClips();
  }, [open, loadClips]);

  const handleImport = useCallback(async () => {
    setImporting(true);
    setStatusMsg(null);
    try {
      await fetchGoalClips(matchId);
      setStatusMsg({ type: "success", text: "Import gestartet – lade Clips…" });
      setTimeout(() => loadClips(), 2500);
    } catch {
      setStatusMsg({ type: "error", text: "n8n-Workflow konnte nicht gestartet werden." });
    } finally {
      setImporting(false);
    }
  }, [matchId, loadClips]);

  const handlePublished = useCallback((clipId) => {
    setClips((prev) => prev.filter((c) => c.id !== clipId));
    setModalClip(null);
    onPublished?.();
    setStatusMsg({ type: "success", text: "✓ Im Liveticker veröffentlicht!" });
  }, [onPublished]);

  const handleDelete = useCallback(async (clipId) => {
    const clip = clips.find((c) => c.id === clipId);
    if (clip?._fromN8n) {
      setClips((prev) => prev.filter((c) => c.id !== clipId));
      return;
    }
    try {
      await deleteClip(clipId);
      setClips((prev) => prev.filter((c) => c.id !== clipId));
    } catch {
      setStatusMsg({ type: "error", text: "Löschen fehlgeschlagen." });
    }
  }, [clips]);

  // Auto-dismiss Status-Meldung nach 3s
  useEffect(() => {
    if (!statusMsg || statusMsg.type !== "success") return;
    const id = setTimeout(() => setStatusMsg(null), 3000);
    return () => clearTimeout(id);
  }, [statusMsg]);

  // Team-Filter neu laden wenn Filter sich ändert
  useEffect(() => {
    if (!open) return;
    loadClips();
  }, [teamFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Team-Namen aus Match ableiten für Filter-Buttons
  const teams = [match?.homeTeam?.name, match?.awayTeam?.name].filter(Boolean);

  return (
    <>
      {modalClip && createPortal(
        <ClipPublishModal
          clip={modalClip}
          matchId={matchId}
          currentMinute={currentMinute}
          onClose={() => setModalClip(null)}
          onPublished={handlePublished}
        />,
        document.body
      )}

      <div style={{ borderRadius: 8, border: "1px solid var(--lt-border)", background: "var(--lt-bg-card)", overflow: "hidden" }}>
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
            <span>🎬</span>
            <span>Clips</span>
            {clips.length > 0 && (
              <span style={{ background: "var(--lt-accent)", color: "#0d0d0d", fontSize: "0.6rem", fontWeight: 700, borderRadius: 4, padding: "1px 6px", lineHeight: 1.4 }}>
                {clips.length}
              </span>
            )}
          </span>
          <svg style={{ width: 14, height: 14, color: "var(--lt-text-faint)", transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div style={{ padding: "0.75rem 1rem 1rem", borderTop: "1px solid var(--lt-border)", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {/* Status */}
            {statusMsg && (
              <div style={{
                borderRadius: 6, padding: "0.4rem 0.75rem",
                fontFamily: "var(--lt-font-mono)", fontSize: "0.7rem",
                background: statusMsg.type === "error" ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)",
                border: `1px solid ${statusMsg.type === "error" ? "rgba(239,68,68,0.25)" : "rgba(34,197,94,0.25)"}`,
                color: statusMsg.type === "error" ? "#f87171" : "#4ade80",
              }}>
                {statusMsg.text}
              </div>
            )}

            {/* Toolbar: Import + Filter */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              <button
                onClick={handleImport}
                disabled={importing}
                style={{
                  flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "0.4rem 0.75rem", borderRadius: 6, border: "none",
                  background: importing ? "var(--lt-bg-card-2)" : "var(--lt-accent)",
                  color: importing ? "var(--lt-text-faint)" : "#0d0d0d",
                  fontFamily: "var(--lt-font-mono)", fontSize: "0.72rem", fontWeight: 700,
                  cursor: importing ? "not-allowed" : "pointer",
                }}
              >
                {importing ? "Importiert…" : "↓ Clips importieren"}
              </button>
              <button
                onClick={loadClips}
                disabled={loading}
                style={{
                  flexShrink: 0, padding: "0.4rem 0.6rem", borderRadius: 6,
                  border: "1px solid var(--lt-border)", background: "transparent",
                  color: "var(--lt-text-muted)", fontFamily: "var(--lt-font-mono)", fontSize: "0.7rem",
                  cursor: loading ? "not-allowed" : "pointer",
                }}
                title="Aktualisieren"
              >
                ↺
              </button>
              {/* Team-Filter */}
              {teams.length > 0 && (
                <div style={{ display: "flex", gap: 4 }}>
                  <button
                    onClick={() => setTeamFilter("")}
                    style={{
                      padding: "0.3rem 0.6rem", borderRadius: 4, border: "1px solid var(--lt-border)",
                      background: !teamFilter ? "var(--lt-accent)" : "transparent",
                      color: !teamFilter ? "#0d0d0d" : "var(--lt-text-muted)",
                      fontFamily: "var(--lt-font-mono)", fontSize: "0.62rem", cursor: "pointer",
                    }}
                  >
                    Alle
                  </button>
                  {teams.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTeamFilter(t)}
                      style={{
                        padding: "0.3rem 0.6rem", borderRadius: 4, border: "1px solid var(--lt-border)",
                        background: teamFilter === t ? "var(--lt-accent)" : "transparent",
                        color: teamFilter === t ? "#0d0d0d" : "var(--lt-text-muted)",
                        fontFamily: "var(--lt-font-mono)", fontSize: "0.62rem", cursor: "pointer",
                        maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}
                      title={t}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Grid */}
            {loading && (
              <p style={{ textAlign: "center", padding: "1rem 0", fontFamily: "var(--lt-font-mono)", fontSize: "0.72rem", color: "var(--lt-text-faint)" }}>
                Lädt…
              </p>
            )}
            {!loading && clips.length === 0 && (
              <p style={{ textAlign: "center", padding: "1rem 0", fontFamily: "var(--lt-font-mono)", fontSize: "0.72rem", color: "var(--lt-text-faint)" }}>
                Keine Clips – erst importieren
              </p>
            )}
            {!loading && clips.length > 0 && (
              <>
                <p style={{ fontFamily: "var(--lt-font-mono)", fontSize: "0.62rem", color: "var(--lt-text-faint)", letterSpacing: "0.04em", margin: 0 }}>
                  Klick → KI-Entwurf + Veröffentlichen
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                  {clips.map((clip) => (
                    <ClipThumbnail key={clip.id} clip={clip} onClick={setModalClip} onDelete={handleDelete} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
});

ClipPickerPanel.propTypes = {
  matchId: PropTypes.number.isRequired,
  match: PropTypes.object,
  currentMinute: PropTypes.number,
  onPublished: PropTypes.func,
};
