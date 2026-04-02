// ============================================================
// YoutubePublishModal — Publish a YouTube video to the ticker
// Extracted from YouTubePanel.tsx and refactored to use PublishModalShell.
// ============================================================

import { useState, useEffect, useRef, type FormEvent } from "react";
import { useCommandPalette, CommandPalettePortal } from "../entry/CommandPalette";
import { generateYoutubeDraft } from "api";
import {
  PUBLISH_PHASES as PHASES,
  TICKER_STYLES,
  MAX_MATCH_MINUTE,
} from "../../constants";
import { useMediaPublishForm } from "../../hooks/useMediaPublishForm";
import logger from "utils/logger";
import { PublishModalShell } from "../PublishModalShell";

// YouTube Video-ID aus URL extrahieren
function getYoutubeId(url: string) {
  try {
    return new URL(url).searchParams.get("v") ?? null;
  } catch {
    return null;
  }
}

export function getThumbnail(clip: {
  thumbnail_url?: string | null;
  video_url?: string | null;
}) {
  if (clip.thumbnail_url) return clip.thumbnail_url;
  if (!clip.video_url) return null;
  const id = getYoutubeId(clip.video_url);
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
}

// ── Publish Modal ─────────────────────────────────────────────

interface YoutubePublishModalProps {
  clip: {
    id: number;
    title?: string | null;
    video_url?: string | null;
    thumbnail_url?: string | null;
  };
  matchId: number;
  currentMinute: number;
  onClose: () => void;
  onPublished: (id: number) => void;
}

export function YoutubePublishModal({
  clip,
  matchId,
  currentMinute,
  onClose,
  onPublished,
}: YoutubePublishModalProps) {
  const [text, setText] = useState("");
  const [style, setStyle] = useState("neutral");
  const [generating, setGenerating] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const {
    minute,
    setMinute,
    phase,
    setPhase,
    loading,
    error,
    setError,
    submit,
  } = useMediaPublishForm(currentMinute);
  const {
    showPalette,
    paletteIdx,
    filteredCmds,
    onValueChange,
    selectCmd,
    handlePaletteKeyDown,
  } = useCommandPalette(text);

  useEffect(() => {
    if (!clip.title) return;
    setGenerating(true);
    generateYoutubeDraft(clip.id, style)
      .then((res) => setText(res.data.text ?? ""))
      .catch((err) =>
        logger.warn(
          "[YouTubePanel] generateYoutubeDraft silenced:",
          err?.message,
        ),
      )
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

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    await submit(clip.id, matchId, text, onPublished);
  }

  const thumbnail = getThumbnail(clip);

  const thumbnailPreview = thumbnail ? (
    <div
      style={{
        position: "relative",
        paddingBottom: "56.25%",
        overflow: "hidden",
      }}
    >
      <img
        src={thumbnail}
        alt={clip.title ?? "YouTube"}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to top, var(--lt-bg-card) 0%, transparent 60%)",
        }}
      />
      <span
        style={{
          position: "absolute",
          bottom: 8,
          left: 12,
          fontFamily: "var(--lt-font-mono)",
          fontSize: "0.65rem",
          color: "var(--lt-text-muted)",
        }}
      >
        📺 {clip.title ?? "YouTube-Video"}
      </span>
    </div>
  ) : undefined;

  const hintNode = (
    <div
      style={{
        fontFamily: "var(--lt-font-mono)",
        fontSize: "0.65rem",
        color: "var(--lt-text-faint)",
        marginTop: 3,
      }}
    >
      <span style={{ color: "var(--lt-accent)" }}>↵</span> Veröffentlichen ·{" "}
      <span style={{ color: "var(--lt-accent)" }}>/?</span> alle Commands
    </div>
  );

  return (
    <PublishModalShell
      onClose={onClose}
      onSubmit={handleSubmit}
      error={error}
      text={generating ? "" : text}
      onTextChange={(v) => {
        setText(v);
        onValueChange(v);
      }}
      textareaRef={textareaRef}
      textareaPlaceholder={
        generating ? "✦ Generiere KI-Entwurf…" : "Ticker-Eintrag …"
      }
      textareaDisabled={generating}
      textareaStyle={{
        color: generating ? "var(--lt-text-muted)" : "var(--lt-text)",
      }}
      onKeyDown={(e) => {
        if (handlePaletteKeyDown(e, setText)) return;
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          handleSubmit();
        }
      }}
      submitLabel="📺 Im Ticker veröffentlichen"
      submitDisabled={loading || generating || !text.trim()}
      submitting={loading}
      preview={thumbnailPreview}
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
          <select
            value={phase}
            onChange={(e) => setPhase(e.target.value)}
            className="lt-form-input"
          >
            {PHASES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          {!phase && (
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
          )}
        </div>
      }
      hintContent={hintNode}
    >
      <CommandPalettePortal
        show={showPalette}
        items={filteredCmds}
        activeIdx={paletteIdx}
        anchorRef={textareaRef}
        onSelect={(cmd) => {
          selectCmd(cmd, setText);
          setTimeout(() => textareaRef.current?.focus(), 0);
        }}
      />
    </PublishModalShell>
  );
}
