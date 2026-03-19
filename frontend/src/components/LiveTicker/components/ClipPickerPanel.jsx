// ============================================================
// ClipPickerPanel.jsx — Persistente Tor-Clips aus DB
// Flow: Clips aus DB laden → Klick → Modal mit KI-Entwurf → Ticker
// ============================================================

import { memo, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { fetchClips, fetchGoalClips, generateClipDraft, publishClip, publishClipTicker, deleteClip } from "../../../api";

const STYLES = ["euphorisch", "neutral", "kritisch"];

// ── Video Player / Thumbnail ──────────────────────────────────

function VideoOrThumb({ clip }) {
  const [playing, setPlaying] = useState(false);

  if (playing && clip.video_url) {
    return (
      <div style={{ position: "relative", paddingBottom: "56.25%", background: "#000" }}>
        <iframe
          src={clip.video_url}
          allow="autoplay; fullscreen"
          allowFullScreen
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
        />
        <div
          onClick={() => setPlaying(false)}
          style={{
            position: "absolute", top: 6, right: 6, zIndex: 10,
            width: 26, height: 26, borderRadius: "50%",
            background: "rgba(0,0,0,0.6)", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", fontSize: "0.75rem",
          }}
        >✕</div>
      </div>
    );
  }

  return (
    <div
      onClick={() => clip.video_url && setPlaying(true)}
      style={{ position: "relative", paddingBottom: "56.25%", overflow: "hidden", cursor: clip.video_url ? "pointer" : "default" }}
    >
      {clip.thumbnail_url && (
        <img
          src={clip.thumbnail_url}
          alt={clip.title ?? "Clip"}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      )}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, var(--lt-bg-card) 0%, transparent 60%)" }} />
      {clip.video_url && (
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: "50%",
            background: "rgba(0,0,0,0.65)", border: "2px solid rgba(255,255,255,0.8)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ color: "#fff", fontSize: "1.1rem", marginLeft: 3 }}>▶</span>
          </div>
          <a
            href={clip.video_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "rgba(0,0,0,0.65)", border: "2px solid rgba(255,255,255,0.5)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontSize: "0.75rem", textDecoration: "none",
            }}
            title="In neuem Tab öffnen"
          >↗</a>
        </div>
      )}
      <span style={{
        position: "absolute", bottom: 8, left: 12,
        fontFamily: "var(--lt-font-mono)", fontSize: "0.65rem", color: "var(--lt-text-muted)",
      }}>
        {clip.player_name ? `⚽ ${clip.player_name}` : clip.title ?? "Clip"}
        {clip.team_name && <span style={{ opacity: 0.7 }}> · {clip.team_name}</span>}
      </span>
    </div>
  );
}

// ── Publish Modal ─────────────────────────────────────────────

function ClipPublishModal({ clip, matchId, currentMinute, onClose, onPublished }) {
  const [text, setText] = useState("");
  const [minute, setMinute] = useState(currentMinute ?? 0);
  const [style, setStyle] = useState("euphorisch");
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // KI-Entwurf direkt beim Öffnen generieren
  useEffect(() => {
    if (!clip.player_name) return;
    setGenerating(true);
    generateClipDraft(clip.id, matchId, style)
      .then((res) => setText(res.data.text ?? ""))
      .catch((err) => console.warn("[ClipPickerPanel] generateClipDraft silenced:", err?.message))
      .finally(() => setGenerating(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleRegenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await generateClipDraft(clip.id, matchId, style);
      setText(res.data.text ?? "");
    } catch {
      setError("KI-Generierung fehlgeschlagen.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSubmit(e) {
    e?.preventDefault();
    if (!text.trim()) { setError("Text darf nicht leer sein."); return; }
    setLoading(true);
    setError(null);
    try {
      if (clip._fromN8n) {
        await publishClipTicker(matchId, text.trim(), clip.video_url, clip.thumbnail_url, minute || null);
      } else {
        await publishClip(clip.id, matchId, text.trim(), minute || null);
      }
      onPublished(clip.id);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : detail ? JSON.stringify(detail) : (err.message ?? "Fehler"));
      setLoading(false);
    }
  }

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div style={{
        width: "100%", maxWidth: 440, borderRadius: 10,
        background: "var(--lt-bg-card)", border: "1px solid var(--lt-border)",
        boxShadow: "0 24px 48px rgba(0,0,0,0.7)", overflow: "hidden", position: "relative",
      }}>
        {/* Video / Thumbnail */}
        {(clip.video_url || clip.thumbnail_url) && (
          <VideoOrThumb clip={clip} />
        )}

        <form onSubmit={handleSubmit} style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {error && (
            <div style={{
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 6, padding: "0.5rem 0.75rem",
              fontFamily: "var(--lt-font-mono)", fontSize: "0.72rem", color: "#f87171",
            }}>
              {error}
            </div>
          )}

          <div>
            {/* Label row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <label style={{ fontFamily: "var(--lt-font-mono)", fontSize: "0.65rem", color: "var(--lt-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Ticker-Text
                </label>
                {/* Style Picker + Regenerate */}
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <select
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    style={{
                      background: "var(--lt-bg-input)", border: "1px solid var(--lt-border)",
                      borderRadius: 4, padding: "1px 4px",
                      fontFamily: "var(--lt-font-mono)", fontSize: "0.62rem",
                      color: "var(--lt-text)", outline: "none",
                    }}
                  >
                    {STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={handleRegenerate}
                    disabled={generating}
                    style={{
                      fontFamily: "var(--lt-font-mono)", fontSize: "0.62rem",
                      color: "var(--lt-accent)", background: "none", border: "none",
                      cursor: generating ? "not-allowed" : "pointer", padding: 0, opacity: generating ? 0.5 : 1,
                    }}
                  >
                    {generating ? "…" : "✦ neu"}
                  </button>
                </div>
              </div>
              {/* Minute */}
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <label style={{ fontFamily: "var(--lt-font-mono)", fontSize: "0.65rem", color: "var(--lt-text-muted)" }}>Min</label>
                <input
                  type="number"
                  value={minute}
                  min={0} max={120}
                  onChange={(e) => setMinute(Number(e.target.value))}
                  style={{
                    width: 46, background: "var(--lt-bg-input)", border: "1px solid var(--lt-border)",
                    borderRadius: 4, padding: "2px 4px",
                    fontFamily: "var(--lt-font-mono)", fontSize: "0.78rem",
                    color: "var(--lt-text)", outline: "none", textAlign: "center",
                  }}
                />
              </div>
            </div>

            <textarea
              autoFocus
              placeholder={generating ? "✦ Generiere KI-Entwurf…" : "Ticker-Text eingeben…"}
              value={generating ? "" : text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.ctrlKey && e.key === "Enter") handleSubmit(); }}
              disabled={generating}
              rows={4}
              style={{
                width: "100%", boxSizing: "border-box", resize: "none",
                background: "var(--lt-bg-input)", border: "1px solid var(--lt-border)",
                borderRadius: 6, padding: "0.6rem 0.75rem",
                fontFamily: "var(--lt-font-mono)", fontSize: "0.82rem",
                color: generating ? "var(--lt-text-muted)" : "var(--lt-text)", lineHeight: 1.5,
                outline: "none", transition: "border-color 0.15s",
              }}
              onFocus={(e) => e.target.style.borderColor = "var(--lt-accent)"}
              onBlur={(e) => e.target.style.borderColor = "var(--lt-border)"}
            />
            <div style={{ fontFamily: "var(--lt-font-mono)", fontSize: "0.65rem", color: "var(--lt-text-faint)", marginTop: 3 }}>
              <span style={{ color: "var(--lt-accent)" }}>Ctrl+↵</span> Veröffentlichen
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", paddingTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1, padding: "0.6rem", borderRadius: 6, border: "1px solid var(--lt-border)",
                background: "transparent", color: "var(--lt-text-muted)",
                fontFamily: "var(--lt-font-mono)", fontSize: "0.8rem", cursor: "pointer",
              }}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading || generating || !text.trim()}
              style={{
                flex: 2, padding: "0.6rem", borderRadius: 6, border: "none",
                background: loading || generating || !text.trim() ? "var(--lt-bg-card-2)" : "var(--lt-accent)",
                color: loading || generating || !text.trim() ? "var(--lt-text-faint)" : "#0d0d0d",
                fontFamily: "var(--lt-font-mono)", fontSize: "0.8rem", fontWeight: 700,
                cursor: loading || generating || !text.trim() ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Publiziere…" : "🎬 Im Ticker veröffentlichen"}
            </button>
          </div>
        </form>

        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 8, right: 8,
            width: 28, height: 28, borderRadius: "50%",
            background: "rgba(0,0,0,0.5)", border: "1px solid var(--lt-border)",
            color: "var(--lt-text-muted)", cursor: "pointer", fontSize: "0.75rem",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >✕</button>
      </div>
    </div>
  );
}

// ── Clip Kachel ───────────────────────────────────────────────

function ClipThumbnail({ clip, onClick, onDelete }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => onClick(clip)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: "relative", overflow: "hidden", borderRadius: 6,
          border: `1px solid ${hovered ? "var(--lt-accent)" : "var(--lt-border)"}`,
          background: "var(--lt-bg-card-2)", cursor: "pointer", padding: 0,
          aspectRatio: "16/9", display: "block", width: "100%",
          transition: "border-color 0.15s", outline: "none",
        }}
      >
        {clip.thumbnail_url ? (
          <img
            src={clip.thumbnail_url}
            alt={clip.player_name ?? "Clip"}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            loading="lazy"
          />
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", color: "var(--lt-text-faint)", fontFamily: "var(--lt-font-mono)", fontSize: "0.65rem" }}>
            🎬
          </div>
        )}
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
          background: hovered ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0.2)", transition: "background 0.15s",
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: hovered ? "var(--lt-accent)" : "rgba(255,255,255,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background 0.15s",
          }}>
            <span style={{ fontSize: "0.7rem", marginLeft: 2, color: hovered ? "#0d0d0d" : "#fff" }}>▶</span>
          </div>
        </div>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.8))", padding: "8px 6px 4px" }}>
          <p style={{ fontFamily: "var(--lt-font-mono)", fontSize: "0.6rem", color: "#fff", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {clip.player_name ?? clip.title ?? "Clip"}
          </p>
          {clip.team_name && (
            <p style={{ fontFamily: "var(--lt-font-mono)", fontSize: "0.55rem", color: "rgba(255,255,255,0.6)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {clip.team_name}
            </p>
          )}
        </div>
      </button>
      {/* Löschen-Button */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(clip.id); }}
        style={{
          position: "absolute", top: 4, right: 4,
          width: 20, height: 20, borderRadius: "50%",
          background: "rgba(0,0,0,0.6)", border: "none",
          color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: "0.6rem",
          display: "flex", alignItems: "center", justifyContent: "center",
          opacity: hovered ? 1 : 0, transition: "opacity 0.15s",
        }}
        title="Clip löschen"
      >✕</button>
    </div>
  );
}

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
            <span>Tor-Clips</span>
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
