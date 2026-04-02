// ============================================================
// YouTubePanel.jsx — YouTube-Videos von @Eintracht
// Flow: n8n scrapet Kanal → DB → Klick → Modal → Ticker
// ============================================================

import { memo, useState, useRef, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import {
  fetchYoutubeClips,
  triggerYoutubeScrape,
} from "api";
import { useSocialPanel } from "../../hooks/useSocialPanel";
import { SocialPanelShell } from "./SocialPanelShell";
import { YoutubePublishModal, getThumbnail } from "./YoutubePublishModal";

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
  const [previewStyle, setPreviewStyle] = useState<CSSProperties | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
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
