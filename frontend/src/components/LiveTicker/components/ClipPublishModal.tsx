import { useState, useEffect, type FormEvent } from "react";
import { generateClipDraft, publishClip, publishClipTicker } from "api";
import { TICKER_STYLES, MAX_MATCH_MINUTE } from "../constants";
import logger from "utils/logger";
import { VideoOrThumb } from "./VideoOrThumb";

interface ClipPublishModalProps {
  clip: { id: string | number; player_name?: string | null; video_url?: string | null; thumbnail_url?: string | null; _fromN8n?: boolean };
  matchId: number;
  currentMinute: number;
  onClose: () => void;
  onPublished: (clipId: string | number) => void;
}

export function ClipPublishModal({ clip, matchId, currentMinute, onClose, onPublished }: ClipPublishModalProps) {
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
    generateClipDraft(Number(clip.id), matchId, style)
      .then((res) => setText(res.data.text ?? ""))
      .catch((err) => logger.warn("[ClipPickerPanel] generateClipDraft silenced:", err?.message))
      .finally(() => setGenerating(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleRegenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await generateClipDraft(Number(clip.id), matchId, style);
      setText(res.data.text ?? "");
    } catch {
      setError("KI-Generierung fehlgeschlagen.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    if (!text.trim()) { setError("Text darf nicht leer sein."); return; }
    setLoading(true);
    setError(null);
    try {
      if (clip._fromN8n) {
        await publishClipTicker(matchId, text.trim(), clip.video_url, clip.thumbnail_url, minute || null);
      } else {
        await publishClip(Number(clip.id), matchId, text.trim(), minute || null, null, null);
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
      className="lt-modal-overlay"
    >
      <div className="lt-modal-card">
        {/* Video / Thumbnail */}
        {(clip.video_url || clip.thumbnail_url) && (
          <VideoOrThumb clip={clip} />
        )}

        <form onSubmit={handleSubmit} style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {error && (
            <div className="lt-msg-error">
              {error}
            </div>
          )}

          <div>
            {/* Label row */}
            <div className="lt-row-between" style={{ marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <label style={{ fontFamily: "var(--lt-font-mono)", fontSize: "0.65rem", color: "var(--lt-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Ticker-Text
                </label>
                {/* Style Picker + Regenerate */}
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <select
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    className="lt-form-input"
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
                  className="lt-form-input"
                  style={{ width: 46, fontSize: "0.78rem", textAlign: "center" }}
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
              className="lt-form-textarea"
              style={{ color: generating ? "var(--lt-text-muted)" : "var(--lt-text)" }}
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
              className="lt-btn-secondary"
              style={{ flex: 1 }}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading || generating || !text.trim()}
              className="lt-btn-primary"
              style={{ flex: 2 }}
            >
              {loading ? "Publiziere…" : "🎬 Im Ticker veröffentlichen"}
            </button>
          </div>
        </form>

        <button
          onClick={onClose}
          className="lt-modal-close"
        >✕</button>
      </div>
    </div>
  );
}
