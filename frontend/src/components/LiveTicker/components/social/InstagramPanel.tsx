// ============================================================
// InstagramPanel.jsx — Instagram-Posts von @EintrachtFrankfurt
// Flow: n8n RSS → DB → Klick → Modal → Ticker
// ============================================================

import { memo, useState, useRef, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { fetchInstagramPosts, triggerInstagramImport } from "api";
import { useSocialPanel } from "../../hooks/useSocialPanel";
import { SocialPublishModal } from "./SocialPublishModal";
import { SocialPanelShell } from "./SocialPanelShell";
import { INSTA_GRADIENT } from "../../constants";
import { useIsMobile } from "hooks/useIsMobile";

// ── Publish Modal ─────────────────────────────────────────────

interface InstaPublishModalProps {
  post: { id: number | string; title?: string | null };
  matchId: number;
  currentMinute: number;
  onClose: () => void;
  onPublished: (id: number | string) => void;
}

function InstaPublishModal({
  post,
  matchId,
  currentMinute,
  onClose,
  onPublished,
}: InstaPublishModalProps) {
  return (
    <SocialPublishModal
      post={post}
      matchId={matchId}
      currentMinute={currentMinute}
      onClose={onClose}
      onPublished={onPublished}
      headerIcon="📸"
      headerLabel="Instagram"
      submitLabel="📸 Im Ticker veröffentlichen"
      submitBackground={INSTA_GRADIENT}
    />
  );
}

// ── Post-Karte (ScorePlay-Style: Hover-Preview + Doppelklick) ─

interface InstaCardProps {
  post: {
    id: number;
    title?: string | null;
    thumbnailUrl?: string | null;
  };
  onClick: (post: InstaCardProps["post"]) => void;
  onDelete: (id: number) => void;
}

function InstaCard({ post, onClick, onDelete }: InstaCardProps) {
  const isMobile = useIsMobile();
  const [hovered, setHovered] = useState(false);
  const [previewStyle, setPreviewStyle] = useState<CSSProperties | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  function handleMouseEnter() {
    if (isMobile) return;
    setHovered(true);
    if (btnRef.current && post.thumbnailUrl) {
      const r = btnRef.current.getBoundingClientRect();
      const spaceRight = window.innerWidth - r.right;
      const previewW = 280;
      const left =
        spaceRight >= previewW + 16 ? r.right + 8 : r.left - previewW - 8;
      const top = Math.min(r.top, window.innerHeight - 300);
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
        onDoubleClick={() => onClick(post)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        title="Doppelklick zum Veröffentlichen"
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 6,
          border: `1px solid ${hovered ? "#e6683c" : "var(--lt-border)"}`,
          background: "var(--lt-bg-card-2)",
          cursor: "pointer",
          padding: 0,
          aspectRatio: "1/1",
          display: "block",
          width: "100%",
          transition: "border-color 0.15s",
          outline: "none",
        }}
      >
        {post.thumbnailUrl ? (
          <img
            src={post.thumbnailUrl}
            alt={post.title ?? "Instagram"}
            referrerPolicy="no-referrer"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              transition: "transform 0.2s",
              transform: hovered ? "scale(1.04)" : "scale(1)",
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
              fontSize: "0.62rem",
              padding: "0.5rem",
              boxSizing: "border-box",
              textAlign: "center",
            }}
          >
            {post.title}
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
                color: "#e6683c",
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

        {/* Caption */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
            padding: "10px 6px 4px",
          }}
        >
          <p
            style={{
              fontFamily: "var(--lt-font-mono)",
              fontSize: "0.58rem",
              color: "var(--lt-text-muted)",
              margin: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {post.title ?? `ID ${post.id}`}
          </p>
        </div>

        {/* Delete */}
        <button
          onDoubleClick={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(post.id);
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
        post.thumbnailUrl &&
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
              src={post.thumbnailUrl}
              alt={post.title ?? "Instagram"}
              referrerPolicy="no-referrer"
              style={{ width: "100%", display: "block", objectFit: "cover" }}
            />
            {post.title && (
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
                {post.title.slice(0, 100)}
                {post.title.length > 100 ? "…" : ""}
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}

// ── Hauptkomponente ───────────────────────────────────────────

interface InstagramPanelProps {
  matchId: number;
  currentMinute?: number;
}

export const InstagramPanel = memo(function InstagramPanel({
  matchId,
  currentMinute = 0,
}: InstagramPanelProps) {
  const {
    open,
    setOpen,
    posts,
    loading,
    importing,
    modalPost,
    setModalPost,
    statusMsg,
    loadPosts,
    handleImport,
    handlePublished,
    handleDelete,
  } = useSocialPanel(fetchInstagramPosts, triggerInstagramImport);

  return (
    <>
      {modalPost &&
        createPortal(
          <InstaPublishModal
            post={modalPost}
            matchId={matchId}
            currentMinute={currentMinute}
            onClose={() => setModalPost(null)}
            onPublished={handlePublished}
          />,
          document.body,
        )}

      <SocialPanelShell
        open={open}
        onToggle={() => setOpen((v) => !v)}
        icon="📸"
        label="Instagram"
        badgeCount={posts.length}
        badgeBackground={INSTA_GRADIENT}
        importing={importing}
        loading={loading}
        onImport={handleImport}
        onRefresh={loadPosts}
        importLabel="📸 Posts importieren"
        importBackground={INSTA_GRADIENT}
        emptyLabel="Keine Posts – erst importieren"
        hintLabel="Doppelklick zum Veröffentlichen"
        statusMsg={statusMsg}
      >
        {posts.map((post) => (
          <InstaCard
            key={post.id}
            post={post}
            onClick={setModalPost}
            onDelete={handleDelete}
          />
        ))}
      </SocialPanelShell>
    </>
  );
});
