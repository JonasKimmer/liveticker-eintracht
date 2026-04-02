import { useState, useEffect, type FormEvent } from "react";
import { generateClipDraft, publishClip, publishClipTicker } from "api";
import { TICKER_STYLES, MAX_MATCH_MINUTE } from "../../constants";
import logger from "utils/logger";
import { VideoOrThumb } from "./VideoOrThumb";
import { PublishModalShell } from "../PublishModalShell";

interface ClipPublishModalProps {
  clip: {
    id: string | number;
    player_name?: string | null;
    video_url?: string | null;
    thumbnail_url?: string | null;
    _fromN8n?: boolean;
  };
  matchId: number;
  currentMinute: number;
  onClose: () => void;
  onPublished: (clipId: string | number) => void;
}

export function ClipPublishModal({
  clip,
  matchId,
  currentMinute,
  onClose,
  onPublished,
}: ClipPublishModalProps) {
  const [text, setText] = useState("");
  const [minute, setMinute] = useState(currentMinute ?? 0);
  const [style, setStyle] = useState("euphorisch");
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // KI-Entwurf direkt beim Öffnen generieren
  useEffect(() => {
    if (!clip.player_name) return;
    setGenerating(true);
    generateClipDraft(Number(clip.id), matchId, style)
      .then((res) => setText(res.data.text ?? ""))
      .catch((err) =>
        logger.warn(
          "[ClipPickerPanel] generateClipDraft silenced:",
          err?.message,
        ),
      )
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
    if (!text.trim()) {
      setError("Text darf nicht leer sein.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (clip._fromN8n) {
        await publishClipTicker(
          matchId,
          text.trim(),
          clip.video_url,
          clip.thumbnail_url,
          minute || null,
        );
      } else {
        await publishClip(
          Number(clip.id),
          matchId,
          text.trim(),
          minute || null,
          null,
          null,
        );
      }
      onPublished(clip.id);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(
        typeof detail === "string"
          ? detail
          : detail
            ? JSON.stringify(detail)
            : (err.message ?? "Fehler"),
      );
      setLoading(false);
    }
  }

  return (
    <PublishModalShell
      onClose={onClose}
      onSubmit={handleSubmit}
      error={error}
      text={generating ? "" : text}
      onTextChange={setText}
      textareaPlaceholder={
        generating ? "✦ Generiere KI-Entwurf…" : "Ticker-Text eingeben…"
      }
      textareaDisabled={generating}
      textareaStyle={{
        color: generating ? "var(--lt-text-muted)" : "var(--lt-text)",
      }}
      onKeyDown={(e) => {
        if (e.ctrlKey && e.key === "Enter") handleSubmit();
      }}
      submitLabel="🎬 Im Ticker veröffentlichen"
      submitDisabled={loading || generating || !text.trim()}
      submitting={loading}
      preview={
        clip.video_url || clip.thumbnail_url ? (
          <VideoOrThumb clip={clip} />
        ) : undefined
      }
      labelExtra={
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            className="lt-form-input"
          >
            {TICKER_STYLES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={generating}
            style={{
              fontFamily: "var(--lt-font-mono)",
              fontSize: "0.62rem",
              color: "var(--lt-accent)",
              background: "none",
              border: "none",
              cursor: generating ? "not-allowed" : "pointer",
              padding: 0,
              opacity: generating ? 0.5 : 1,
            }}
          >
            {generating ? "…" : "✦ neu"}
          </button>
        </div>
      }
      extraControls={
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <label
            style={{
              fontFamily: "var(--lt-font-mono)",
              fontSize: "0.65rem",
              color: "var(--lt-text-muted)",
            }}
          >
            Min
          </label>
          <input
            type="number"
            value={minute}
            min={0}
            max={MAX_MATCH_MINUTE}
            onChange={(e) => setMinute(Number(e.target.value))}
            className="lt-form-input"
            style={{
              width: 46,
              fontSize: "0.78rem",
              textAlign: "center",
            }}
          />
        </div>
      }
    />
  );
}
