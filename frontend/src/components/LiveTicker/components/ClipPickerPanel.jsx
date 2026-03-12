// ============================================================
// ClipPickerPanel.jsx — Bundesliga Tor-Clips für den Ticker
// Flow: Clips laden → Klick → Modal → Im Ticker veröffentlichen
// ============================================================

import { useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { fetchGoalClips, publishClipTicker } from "../../../api";

const JW_EMBED = (vid) => `https://cdn.jwplayer.com/players/${vid}.html`;

// ── Publish Modal ─────────────────────────────────────────────

function ClipPublishModal({ clip, matchId, currentMinute, onClose, onPublished }) {
  const [text, setText] = useState(clip.title ?? clip.player ?? "");
  const [minute, setMinute] = useState(currentMinute ?? 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e?.preventDefault();
    if (!text.trim()) { setError("Text darf nicht leer sein."); return; }
    setLoading(true);
    setError(null);
    try {
      const videoUrl = clip.vid ? JW_EMBED(clip.vid) : (clip.url ?? null);
      await publishClipTicker(matchId, text.trim(), videoUrl, clip.thumbnail ?? null, minute || null);
      onPublished();
    } catch (err) {
      setError(err?.response?.data?.detail ?? err.message ?? "Fehler beim Veröffentlichen");
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
        {/* Thumbnail */}
        {clip.thumbnail && (
          <div style={{ position: "relative", aspectRatio: "16/7", overflow: "hidden" }}>
            <img
              src={clip.thumbnail}
              alt={clip.title ?? "Clip"}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(to top, var(--lt-bg-card) 0%, transparent 60%)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: "50%",
                background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ fontSize: "1.2rem", marginLeft: 3 }}>▶</span>
              </div>
            </div>
            <span style={{
              position: "absolute", bottom: 8, left: 12,
              fontFamily: "var(--lt-font-mono)", fontSize: "0.65rem",
              color: "var(--lt-text-muted)", maxWidth: "80%",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {clip.title ?? clip.player ?? "Tor-Clip"}
            </span>
          </div>
        )}

        {/* Formular */}
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <label style={{ fontFamily: "var(--lt-font-mono)", fontSize: "0.65rem", color: "var(--lt-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Ticker-Text
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <label style={{ fontFamily: "var(--lt-font-mono)", fontSize: "0.65rem", color: "var(--lt-text-muted)" }}>Minute</label>
                <input
                  type="number"
                  value={minute}
                  min={0} max={120}
                  onChange={(e) => setMinute(Number(e.target.value))}
                  style={{
                    width: 54, background: "var(--lt-bg-input)", border: "1px solid var(--lt-border)",
                    borderRadius: 4, padding: "2px 6px",
                    fontFamily: "var(--lt-font-mono)", fontSize: "0.78rem",
                    color: "var(--lt-text)", outline: "none", textAlign: "center",
                  }}
                />
              </div>
            </div>
            <textarea
              autoFocus
              placeholder="Beschreibung zum Clip…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.ctrlKey && e.key === "Enter") handleSubmit(); }}
              rows={3}
              style={{
                width: "100%", boxSizing: "border-box", resize: "none",
                background: "var(--lt-bg-input)", border: "1px solid var(--lt-border)",
                borderRadius: 6, padding: "0.6rem 0.75rem",
                fontFamily: "var(--lt-font-mono)", fontSize: "0.82rem",
                color: "var(--lt-text)", lineHeight: 1.5,
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
              disabled={loading || !text.trim()}
              style={{
                flex: 2, padding: "0.6rem", borderRadius: 6, border: "none",
                background: loading || !text.trim() ? "var(--lt-bg-card-2)" : "var(--lt-accent)",
                color: loading || !text.trim() ? "var(--lt-text-faint)" : "#0d0d0d",
                fontFamily: "var(--lt-font-mono)", fontSize: "0.8rem", fontWeight: 700,
                cursor: loading || !text.trim() ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Publiziere…" : "🎬 Im Ticker veröffentlichen"}
            </button>
          </div>
        </form>

        {/* X */}
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 8, right: 8,
            width: 28, height: 28, borderRadius: "50%",
            background: "rgba(0,0,0,0.5)", border: "1px solid var(--lt-border)",
            color: "var(--lt-text-muted)", cursor: "pointer", fontSize: "0.75rem",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ── Clip Kachel ───────────────────────────────────────────────

function ClipThumbnail({ clip, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={() => onClick(clip)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={clip.title ?? clip.player ?? "Clip öffnen"}
      style={{
        position: "relative", overflow: "hidden", borderRadius: 6,
        border: `1px solid ${hovered ? "var(--lt-accent)" : "var(--lt-border)"}`,
        background: "var(--lt-bg-card-2)", cursor: "pointer", padding: 0,
        aspectRatio: "16/9", display: "block", width: "100%",
        transition: "border-color 0.15s", outline: "none",
      }}
    >
      {clip.thumbnail ? (
        <img
          src={clip.thumbnail}
          alt={clip.title ?? "Clip"}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          loading="lazy"
        />
      ) : (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", color: "var(--lt-text-faint)", fontFamily: "var(--lt-font-mono)", fontSize: "0.65rem" }}>
          kein Vorschaubild
        </div>
      )}
      {/* Play-Overlay */}
      <div style={{
        position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
        background: hovered ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0.25)",
        transition: "background 0.15s",
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: hovered ? "var(--lt-accent)" : "rgba(255,255,255,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "background 0.15s",
        }}>
          <span style={{ fontSize: "0.8rem", marginLeft: 2, color: hovered ? "#0d0d0d" : "#fff" }}>▶</span>
        </div>
      </div>
      {/* Name */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.75))", padding: "10px 6px 4px" }}>
        <p style={{ fontFamily: "var(--lt-font-mono)", fontSize: "0.6rem", color: "var(--lt-text-muted)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {clip.title ?? clip.player ?? "Tor-Clip"}
        </p>
      </div>
    </button>
  );
}

// ── Hauptkomponente ───────────────────────────────────────────

export function ClipPickerPanel({ matchId, currentMinute = 0 }) {
  const [open, setOpen] = useState(false);
  const [clips, setClips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modalClip, setModalClip] = useState(null);
  const [statusMsg, setStatusMsg] = useState(null);

  const handleLoad = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchGoalClips();
      const raw = res.data;
      const list = Array.isArray(raw) ? raw : (raw?.items ?? []);
      setClips(list.map((item) => item?.json ?? item));
    } catch (e) {
      setError("Clips konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, []);

  function handlePublished() {
    setModalClip(null);
    setStatusMsg({ type: "success", text: "✓ Im Liveticker veröffentlicht!" });
    setTimeout(() => setStatusMsg(null), 3000);
  }

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
            <span>🎬</span>
            <span>Tor-Clips</span>
            {clips.length > 0 && (
              <span style={{
                background: "var(--lt-accent)", color: "#0d0d0d",
                fontSize: "0.6rem", fontWeight: 700, borderRadius: 4,
                padding: "1px 6px", lineHeight: 1.4,
              }}>
                {clips.length}
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

            {error && (
              <div style={{
                borderRadius: 6, padding: "0.4rem 0.75rem",
                fontFamily: "var(--lt-font-mono)", fontSize: "0.7rem",
                background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)",
                color: "#f87171",
              }}>
                {error}
              </div>
            )}

            {/* Load button */}
            <button
              onClick={handleLoad}
              disabled={loading}
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "0.5rem 1rem", borderRadius: 6, border: "none",
                background: loading ? "var(--lt-bg-card-2)" : "var(--lt-accent)",
                color: loading ? "var(--lt-text-faint)" : "#0d0d0d",
                fontFamily: "var(--lt-font-mono)", fontSize: "0.75rem", fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer", transition: "all 0.15s",
              }}
            >
              {loading ? "Lädt…" : "↓ Clips laden"}
            </button>

            {/* Grid */}
            {clips.length === 0 && !loading && (
              <p style={{ textAlign: "center", padding: "1rem 0", fontFamily: "var(--lt-font-mono)", fontSize: "0.72rem", color: "var(--lt-text-faint)" }}>
                Keine Clips geladen
              </p>
            )}

            {clips.length > 0 && (
              <>
                <p style={{ fontFamily: "var(--lt-font-mono)", fontSize: "0.62rem", color: "var(--lt-text-faint)", letterSpacing: "0.04em", margin: 0 }}>
                  Klick zum Veröffentlichen
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                  {clips.map((clip, i) => (
                    <ClipThumbnail key={clip.vid ?? clip.url ?? i} clip={clip} onClick={setModalClip} />
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
