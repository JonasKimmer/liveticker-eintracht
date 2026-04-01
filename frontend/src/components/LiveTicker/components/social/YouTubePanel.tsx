// ============================================================
// YouTubePanel.jsx — YouTube-Videos von @Eintracht
// Flow: n8n scrapet Kanal → DB → Klick → Modal → Ticker
// ============================================================

import { memo, useState, useEffect, useRef, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useCommandPalette, CommandPalettePortal } from "../CommandPalette";
import {
  fetchYoutubeClips,
  triggerYoutubeScrape,
  generateYoutubeDraft,
} from "api";
import {
  PUBLISH_PHASES as PHASES,
  TICKER_STYLES,
  MAX_MATCH_MINUTE,
} from "../../constants";
import { useMediaPublishForm } from "../../hooks/useMediaPublishForm";
import { useSocialPanel } from "../../hooks/useSocialPanel";
import { SocialPanelShell } from "./SocialPanelShell";
import logger from "utils/logger";

// YouTube Video-ID aus URL extrahieren
function getYoutubeId(url: string) {
  try {
    return new URL(url).searchParams.get("v") ?? null;
  } catch {
    return null;
  }
}

function getThumbnail(clip: { thumbnail_url?: string | null; video_url?: string | null }) {
  if (clip.thumbnail_url) return clip.thumbnail_url;
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

function YoutubePublishModal({
  clip,
  matchId,
  currentMinute,
  onClose,
  onPublished,
}: YoutubePublishModalProps) {
  const [text, setText] = useState("");
  const [style, setStyle] = useState("neutral");
  const [generating, setGenerating] = useState(false);
  const textareaRef = useRef(null);
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

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="lt-modal-overlay"
    >
      <div className="lt-modal-card">
        {/* Thumbnail */}
        {thumbnail && (
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
        )}

        <form
          onSubmit={handleSubmit}
          style={{
            padding: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          {error && <div className="lt-msg-error">{error}</div>}

          <div>
            <div className="lt-row-between" style={{ marginBottom: 4 }}>
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <label
                  style={{
                    fontFamily: "var(--lt-font-mono)",
                    fontSize: "0.65rem",
                    color: "var(--lt-text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Ticker-Text
                </label>
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
              </div>
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
            </div>

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
            <textarea
              ref={textareaRef}
              autoFocus
              placeholder={
                generating ? "✦ Generiere KI-Entwurf…" : "Ticker-Eintrag …"
              }
              value={generating ? "" : text}
              onChange={(e) => {
                setText(e.target.value);
                onValueChange(e.target.value);
              }}
              onKeyDown={(e) => {
                if (handlePaletteKeyDown(e, setText)) return;
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              disabled={generating}
              rows={4}
              className="lt-form-textarea"
              style={{
                color: generating ? "var(--lt-text-muted)" : "var(--lt-text)",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--lt-accent)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--lt-border)")}
            />
            <div
              style={{
                fontFamily: "var(--lt-font-mono)",
                fontSize: "0.65rem",
                color: "var(--lt-text-faint)",
                marginTop: 3,
              }}
            >
              <span style={{ color: "var(--lt-accent)" }}>↵</span>{" "}
              Veröffentlichen ·{" "}
              <span style={{ color: "var(--lt-accent)" }}>/?</span> alle
              Commands
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
              {loading ? "Publiziere…" : "📺 Im Ticker veröffentlichen"}
            </button>
          </div>
        </form>

        <button onClick={onClose} className="lt-modal-close">
          ✕
        </button>
      </div>
    </div>
  );
}

// ── Video-Kachel (ScorePlay-Style: Hover-Preview + Doppelklick) ─

interface YouTubeThumbnailProps {
  clip: {
    id: number;
    title?: string | null;
    video_url?: string | null;
    thumbnail_url?: string | null;
  };
  onClick: (clip: YouTubeThumbnailProps["clip"]) => void;
  onDelete: (id: number) => void;
}

function YouTubeThumbnail({ clip, onClick, onDelete }: YouTubeThumbnailProps) {
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
      const left =
        spaceRight >= previewW + 16 ? r.right + 8 : r.left - previewW - 8;
      const top = Math.min(r.top, window.innerHeight - 220);
      setPreviewStyle({
        position: "fixed",
        top,
        left,
        width: previewW,
        zIndex: 9999,
      });
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
          position: "relative",
          overflow: "hidden",
          borderRadius: 6,
          border: `1px solid ${hovered ? "#ff0000" : "var(--lt-border)"}`,
          background: "var(--lt-bg-card-2)",
          cursor: "pointer",
          padding: 0,
          aspectRatio: "16/9",
          display: "block",
          width: "100%",
          transition: "border-color 0.15s",
          outline: "none",
        }}
      >
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={clip.title ?? "YouTube"}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
            loading="lazy"
          />
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: "100%",
              color: "var(--lt-text-faint)",
              fontFamily: "var(--lt-font-mono)",
              fontSize: "0.65rem",
            }}
          >
            📺
          </div>
        )}

        {/* Hover overlay */}
        {hovered && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontFamily: "var(--lt-font-mono)",
                fontSize: "0.6rem",
                fontWeight: 700,
                color: "#ff0000",
                background: "rgba(0,0,0,0.65)",
                padding: "3px 8px",
                borderRadius: 4,
                letterSpacing: "0.05em",
              }}
            >
              DOPPELKLICK
            </span>
          </div>
        )}

        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            background: "linear-gradient(transparent, rgba(0,0,0,0.85))",
            padding: "8px 6px 4px",
          }}
        >
          <p
            style={{
              fontFamily: "var(--lt-font-mono)",
              fontSize: "0.58rem",
              color: "#fff",
              margin: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {clip.title ?? "YouTube-Video"}
          </p>
        </div>

        {/* Delete */}
        <button
          onDoubleClick={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(clip.id);
          }}
          style={{
            position: "absolute",
            top: 4,
            right: 4,
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "rgba(0,0,0,0.6)",
            border: "none",
            color: "rgba(255,255,255,0.6)",
            cursor: "pointer",
            fontSize: "0.6rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: hovered ? 1 : 0,
            transition: "opacity 0.15s",
          }}
          title="Löschen"
        >
          ✕
        </button>
      </button>

      {/* Hover-Preview Portal */}
      {previewStyle &&
        thumbnail &&
        createPortal(
          <div
            style={{
              ...previewStyle,
              borderRadius: 8,
              overflow: "hidden",
              boxShadow: "0 16px 48px rgba(0,0,0,0.7)",
              border: "1px solid var(--lt-border)",
              pointerEvents: "none",
            }}
          >
            <img
              src={thumbnail}
              alt={clip.title ?? "YouTube"}
              style={{ width: "100%", display: "block", objectFit: "cover" }}
            />
            {clip.title && (
              <div
                style={{
                  background: "var(--lt-bg-card)",
                  padding: "6px 10px",
                  fontFamily: "var(--lt-font-mono)",
                  fontSize: "0.62rem",
                  color: "var(--lt-text-muted)",
                  lineHeight: 1.4,
                }}
              >
                {clip.title.slice(0, 100)}
                {clip.title.length > 100 ? "…" : ""}
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}

// ── Hauptkomponente ───────────────────────────────────────────

interface YouTubePanelProps {
  matchId: number;
  currentMinute?: number;
}

export const YouTubePanel = memo(function YouTubePanel({
  matchId,
  currentMinute = 0,
}: YouTubePanelProps) {
  const {
    open,
    setOpen,
    posts: clips,
    loading,
    importing,
    modalPost: modalClip,
    setModalPost: setModalClip,
    statusMsg,
    loadPosts: loadClips,
    handleImport: handleScrape,
    handlePublished,
    handleDelete,
  } = useSocialPanel(fetchYoutubeClips, triggerYoutubeScrape);

  return (
    <>
      {modalClip &&
        createPortal(
          <YoutubePublishModal
            clip={modalClip}
            matchId={matchId}
            currentMinute={currentMinute}
            onClose={() => setModalClip(null)}
            onPublished={handlePublished}
          />,
          document.body,
        )}

      <SocialPanelShell
        open={open}
        onToggle={() => setOpen((v) => !v)}
        icon="📺"
        label="YouTube"
        badgeCount={clips.length}
        badgeBackground="#ff0000"
        importing={importing}
        loading={loading}
        onImport={handleScrape}
        onRefresh={loadClips}
        importLabel="▶ Kanal scrapen"
        importingLabel="Scrapt…"
        importBackground="#ff0000"
        emptyLabel="Keine Videos – erst Kanal scrapen"
        hintLabel="Doppelklick zum Veröffentlichen"
        statusMsg={statusMsg}
        gridColumns="1fr 1fr"
      >
        {clips.map((clip) => (
          <YouTubeThumbnail
            key={clip.id}
            clip={clip}
            onClick={setModalClip}
            onDelete={handleDelete}
          />
        ))}
      </SocialPanelShell>
    </>
  );
});
