import { useState, useEffect } from "react";
import { generateClipDraft, publishClip, publishClipTicker } from "api";
import { TICKER_STYLES, MAX_MATCH_MINUTE } from "../constants";
import logger from "utils/logger";
import { VideoOrThumb } from "./VideoOrThumb";

export function ClipPublishModal({ clip, matchId, currentMinute, onClose, onPublished }) {
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
      .catch((err) => logger.warn("[ClipPickerPanel] generateClipDraft silenced:", err?.message))
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
              {/* Minute */}
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <label style={{ fontFamily: "var(--lt-font-mono)", fontSize: "0.65rem", color: "var(--lt-text-muted)" }}>Min</label>
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
