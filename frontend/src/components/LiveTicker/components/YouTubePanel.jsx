// ============================================================
// YouTubePanel.jsx — YouTube-Videos von @Eintracht
// Flow: n8n scrapet Kanal → DB → Klick → Modal → Ticker
// ============================================================

import { memo, useState, useCallback, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { createPortal } from "react-dom";
import { useCommandPalette, CommandPalettePortal } from "./commandPalette";
import {
  fetchYoutubeClips,
  triggerYoutubeScrape,
  generateYoutubeDraft,
  deleteClip,
} from "api";
import { PUBLISH_PHASES as PHASES, TICKER_STYLES, MAX_MATCH_MINUTE } from "../constants";
import { useMediaPublishForm } from "../hooks/useMediaPublishForm";
import logger from "utils/logger";

// YouTube Video-ID aus URL extrahieren
function getYoutubeId(url) {
  try {
    return new URL(url).searchParams.get("v") ?? null;
  } catch {
    return null;
  }
}


function getThumbnail(clip) {
  if (clip.thumbnail_url) return clip.thumbnail_url;
  const id = getYoutubeId(clip.video_url);
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
}

// ── Publish Modal ─────────────────────────────────────────────

function YoutubePublishModal({ clip, matchId, currentMinute, onClose, onPublished }) {
  const [text, setText] = useState("");
  const [style, setStyle] = useState("neutral");
  const [generating, setGenerating] = useState(false);
  const textareaRef = useRef(null);
  const { minute, setMinute, phase, setPhase, loading, error, setError, submit } = useMediaPublishForm(currentMinute);
  const { showPalette, paletteIdx, filteredCmds, onValueChange, selectCmd, handlePaletteKeyDown } = useCommandPalette(text);

  useEffect(() => {
    if (!clip.title) return;
    setGenerating(true);
    generateYoutubeDraft(clip.id, style)
      .then((res) => setText(res.data.text ?? ""))
      .catch((err) => logger.warn("[YouTubePanel] generateYoutubeDraft silenced:", err?.message))
      .finally(() => setGenerating(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleRegenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await generateYoutubeDraft(clip.id, style);
      setText(res.data.text ?? "");
    } catch {
      setError("KI-Generierung fehlgeschlagen.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSubmit(e) {
    e?.preventDefault();
    await submit(clip.id, matchId, text, onPublished);
  }

  const thumbnail = getThumbnail(clip);

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
        {thumbnail && (
          <div style={{ position: "relative", paddingBottom: "56.25%", overflow: "hidden" }}>
            <img
              src={thumbnail}
              alt={clip.title ?? "YouTube"}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, var(--lt-bg-card) 0%, transparent 60%)" }} />
            <span style={{
              position: "absolute", bottom: 8, left: 12,
              fontFamily: "var(--lt-font-mono)", fontSize: "0.65rem",
              color: "var(--lt-text-muted)",
            }}>
              📺 {clip.title ?? "YouTube-Video"}
            </span>
          </div>
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <label style={{ fontFamily: "var(--lt-font-mono)", fontSize: "0.65rem", color: "var(--lt-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Ticker-Text
                </label>
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
                    {TICKER_STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
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
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <select
                  value={phase}
                  onChange={(e) => setPhase(e.target.value)}
                  style={{
                    background: "var(--lt-bg-input)", border: "1px solid var(--lt-border)",
                    borderRadius: 4, padding: "2px 4px",
                    fontFamily: "var(--lt-font-mono)", fontSize: "0.62rem",
                    color: "var(--lt-text)", outline: "none",
                  }}
                >
                  {PHASES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
                {!phase && (
                  <input
                    type="number"
                    value={minute}
                    min={0} max={MAX_MATCH_MINUTE}
                    onChange={(e) => setMinute(Number(e.target.value))}
                    style={{
                      width: 46, background: "var(--lt-bg-input)", border: "1px solid var(--lt-border)",
                      borderRadius: 4, padding: "2px 4px",
                      fontFamily: "var(--lt-font-mono)", fontSize: "0.78rem",
                      color: "var(--lt-text)", outline: "none", textAlign: "center",
                    }}
                  />
                )}
              </div>
            </div>

            <CommandPalettePortal
              show={showPalette}
              items={filteredCmds}
              activeIdx={paletteIdx}
              anchorRef={textareaRef}
              onSelect={(cmd) => { selectCmd(cmd, setText); setTimeout(() => textareaRef.current?.focus(), 0); }}
            />
            <textarea
              ref={textareaRef}
              autoFocus
              placeholder={generating ? "✦ Generiere KI-Entwurf…" : "Ticker-Eintrag …"}
              value={generating ? "" : text}
              onChange={(e) => { setText(e.target.value); onValueChange(e.target.value); }}
              onKeyDown={(e) => {
                if (handlePaletteKeyDown(e, setText)) return;
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
              }}
              disabled={generating}
              rows={4}
              style={{
                width: "100%", boxSizing: "border-box", resize: "none",
                background: "var(--lt-bg-input)", border: "1px solid var(--lt-border)",
                borderRadius: 6, padding: "0.6rem 0.75rem",
                fontFamily: "var(--lt-font-mono)", fontSize: "0.82rem",
                color: generating ? "var(--lt-text-muted)" : "var(--lt-text)", lineHeight: 1.5,
                outline: "none",
              }}
              onFocus={(e) => e.target.style.borderColor = "var(--lt-accent)"}
              onBlur={(e) => e.target.style.borderColor = "var(--lt-border)"}
            />
            <div style={{ fontFamily: "var(--lt-font-mono)", fontSize: "0.65rem", color: "var(--lt-text-faint)", marginTop: 3 }}>
              <span style={{ color: "var(--lt-accent)" }}>↵</span> Veröffentlichen · <span style={{ color: "var(--lt-accent)" }}>/?</span> alle Commands
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
              {loading ? "Publiziere…" : "📺 Im Ticker veröffentlichen"}
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

// ── Video-Kachel (ScorePlay-Style: Hover-Preview + Doppelklick) ─

function YouTubeThumbnail({ clip, onClick, onDelete }) {
  const [hovered, setHovered] = useState(false);
  const [previewStyle, setPreviewStyle] = useState(null);
  const btnRef = useRef(null);
  const thumbnail = getThumbnail(clip);

  function handleMouseEnter() {
    setHovered(true);
    if (btnRef.current && thumbnail) {
      const r = btnRef.current.getBoundingClientRect();
      const spaceRight = window.innerWidth - r.right;
      const previewW = 320;
      const left = spaceRight >= previewW + 16 ? r.right + 8 : r.left - previewW - 8;
      const top = Math.min(r.top, window.innerHeight - 220);
      setPreviewStyle({ position: "fixed", top, left, width: previewW, zIndex: 9999 });
    }
  }

  function handleMouseLeave() {
    setHovered(false);
    setPreviewStyle(null);
  }

  return (
    <>
      <button
        ref={btnRef}
        onDoubleClick={() => onClick(clip)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        title="Doppelklick zum Veröffentlichen"
        style={{
          position: "relative", overflow: "hidden", borderRadius: 6,
          border: `1px solid ${hovered ? "#ff0000" : "var(--lt-border)"}`,
          background: "var(--lt-bg-card-2)", cursor: "pointer", padding: 0,
          aspectRatio: "16/9", display: "block", width: "100%",
          transition: "border-color 0.15s", outline: "none",
        }}
      >
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={clip.title ?? "YouTube"}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            loading="lazy"
          />
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", color: "var(--lt-text-faint)", fontFamily: "var(--lt-font-mono)", fontSize: "0.65rem" }}>
            📺
          </div>
        )}

        {/* Hover overlay */}
        {hovered && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: "var(--lt-font-mono)", fontSize: "0.6rem", fontWeight: 700, color: "#ff0000", background: "rgba(0,0,0,0.65)", padding: "3px 8px", borderRadius: 4, letterSpacing: "0.05em" }}>
              DOPPELKLICK
            </span>
          </div>
        )}

        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.85))", padding: "8px 6px 4px" }}>
          <p style={{ fontFamily: "var(--lt-font-mono)", fontSize: "0.58rem", color: "#fff", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {clip.title ?? "YouTube-Video"}
          </p>
        </div>

        {/* Delete */}
        <button
          onDoubleClick={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onDelete(clip.id); }}
          style={{
            position: "absolute", top: 4, right: 4,
            width: 20, height: 20, borderRadius: "50%",
            background: "rgba(0,0,0,0.6)", border: "none",
            color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: "0.6rem",
            display: "flex", alignItems: "center", justifyContent: "center",
            opacity: hovered ? 1 : 0, transition: "opacity 0.15s",
          }}
          title="Löschen"
        >✕</button>
      </button>

      {/* Hover-Preview Portal */}
      {previewStyle && thumbnail && createPortal(
        <div style={{ ...previewStyle, borderRadius: 8, overflow: "hidden", boxShadow: "0 16px 48px rgba(0,0,0,0.7)", border: "1px solid var(--lt-border)", pointerEvents: "none" }}>
          <img
            src={thumbnail}
            alt={clip.title ?? "YouTube"}
            style={{ width: "100%", display: "block", objectFit: "cover" }}
          />
          {clip.title && (
            <div style={{ background: "var(--lt-bg-card)", padding: "6px 10px", fontFamily: "var(--lt-font-mono)", fontSize: "0.62rem", color: "var(--lt-text-muted)", lineHeight: 1.4 }}>
              {clip.title.slice(0, 100)}{clip.title.length > 100 ? "…" : ""}
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
}

// ── Hauptkomponente ───────────────────────────────────────────

export const YouTubePanel = memo(function YouTubePanel({ matchId, currentMinute = 0 }) {
  const [open, setOpen] = useState(false);
  const [clips, setClips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [modalClip, setModalClip] = useState(null);
  const [statusMsg, setStatusMsg] = useState(null);

  const loadClips = useCallback(async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetchYoutubeClips();
      setClips(res.data ?? []);
    } catch {
      setStatusMsg({ type: "error", text: "Fehler beim Laden der Videos." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    loadClips();
  }, [open, loadClips]);

  const handleScrape = useCallback(async () => {
    setScraping(true);
    setStatusMsg(null);
    try {
      await triggerYoutubeScrape();
      setStatusMsg({ type: "success", text: "Scraping gestartet – lade in 5s neu…" });
      setTimeout(() => loadClips(), 5000);
    } catch {
      setStatusMsg({ type: "error", text: "n8n-Workflow konnte nicht gestartet werden." });
    } finally {
      setScraping(false);
    }
  }, [loadClips]);

  const handlePublished = useCallback((clipId) => {
    setClips((prev) => prev.filter((c) => c.id !== clipId));
    setModalClip(null);
    setStatusMsg({ type: "success", text: "✓ Im Liveticker veröffentlicht!" });
  }, []);

  const handleDelete = useCallback(async (clipId) => {
    try {
      await deleteClip(clipId);
      setClips((prev) => prev.filter((c) => c.id !== clipId));
    } catch {
      setStatusMsg({ type: "error", text: "Löschen fehlgeschlagen." });
    }
  }, []);

  // Auto-dismiss Status-Meldung nach 3s
  useEffect(() => {
    if (!statusMsg || statusMsg.type !== "success") return;
    const id = setTimeout(() => setStatusMsg(null), 3000);
    return () => clearTimeout(id);
  }, [statusMsg]);

  return (
    <>
      {modalClip && createPortal(
        <YoutubePublishModal
          clip={modalClip}
          matchId={matchId}
          currentMinute={currentMinute}
          onClose={() => setModalClip(null)}
          onPublished={handlePublished}
        />,
        document.body
      )}

      <div style={{ borderRadius: 8, border: "1px solid var(--lt-border)", background: "var(--lt-bg-card)", overflow: "hidden" }}>
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
            <span>📺</span>
            <span>YouTube</span>
            {clips.length > 0 && (
              <span style={{ background: "#ff0000", color: "#fff", fontSize: "0.6rem", fontWeight: 700, borderRadius: 4, padding: "1px 6px", lineHeight: 1.4 }}>
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

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <button
                onClick={handleScrape}
                disabled={scraping}
                style={{
                  flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "0.4rem 0.75rem", borderRadius: 6, border: "none",
                  background: scraping ? "var(--lt-bg-card-2)" : "#ff0000",
                  color: scraping ? "var(--lt-text-faint)" : "#fff",
                  fontFamily: "var(--lt-font-mono)", fontSize: "0.72rem", fontWeight: 700,
                  cursor: scraping ? "not-allowed" : "pointer",
                }}
              >
                {scraping ? "Scrapt…" : "▶ Kanal scrapen"}
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
            </div>

            {loading && (
              <p style={{ textAlign: "center", padding: "1rem 0", fontFamily: "var(--lt-font-mono)", fontSize: "0.72rem", color: "var(--lt-text-faint)" }}>
                Lädt…
              </p>
            )}
            {!loading && clips.length === 0 && (
              <p style={{ textAlign: "center", padding: "1rem 0", fontFamily: "var(--lt-font-mono)", fontSize: "0.72rem", color: "var(--lt-text-faint)" }}>
                Keine Videos – erst Kanal scrapen
              </p>
            )}
            {!loading && clips.length > 0 && (
              <>
                <p style={{ fontFamily: "var(--lt-font-mono)", fontSize: "0.62rem", color: "var(--lt-text-faint)", letterSpacing: "0.04em", margin: 0 }}>
                  Doppelklick zum Veröffentlichen
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                  {clips.map((clip) => (
                    <YouTubeThumbnail key={clip.id} clip={clip} onClick={setModalClip} onDelete={handleDelete} />
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

YouTubePanel.propTypes = {
  matchId: PropTypes.number.isRequired,
  currentMinute: PropTypes.number,
};
