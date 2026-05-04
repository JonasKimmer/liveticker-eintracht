// ============================================================
// TwitterPanel.jsx — Twitter/X-Posts von @Eintracht
// Flow: n8n RSS → DB → Klick → Modal → Ticker
// ============================================================

import { memo, useState } from "react";
import { useIsMobile } from "hooks/useIsMobile";
import { createPortal } from "react-dom";
import { fetchTwitterPosts, triggerTwitterImport } from "api";
import { useSocialPanel } from "../../hooks/useSocialPanel";
import { SocialPublishModal } from "./SocialPublishModal";
import { SocialPanelShell } from "./SocialPanelShell";

// ── Publish Modal ─────────────────────────────────────────────

interface TwitterPublishModalProps {
  post: { id: number | string; title?: string | null };
  matchId: number;
  currentMinute: number;
  onClose: () => void;
  onPublished: (id: number | string) => void;
}

function TwitterPublishModal({
  post,
  matchId,
  currentMinute,
  onClose,
  onPublished,
}: TwitterPublishModalProps) {
  return (
    <SocialPublishModal
      post={post}
      matchId={matchId}
      currentMinute={currentMinute}
      onClose={onClose}
      onPublished={onPublished}
      headerIcon="𝕏"
      headerLabel="@Eintracht · Im Ticker veröffentlichen"
      submitLabel="𝕏 Im Ticker veröffentlichen"
      submitBackground="#000"
    />
  );
}

// ── Tweet-Karte ───────────────────────────────────────────────

interface TweetCardProps {
  post: {
    id: number;
    title?: string | null;
    thumbnailUrl?: string | null;
    videoUrl?: string | null;
  };
  onClick: (post: TweetCardProps["post"]) => void;
  onDelete: (id: number) => void;
}

function TweetCard({ post, onClick, onDelete }: TweetCardProps) {
  const isMobile = useIsMobile();
  const [hovered, setHovered] = useState(false);
  const hasThumbnail = !!post.thumbnailUrl;

  if (hasThumbnail) {
    return (
      <div
        style={{ position: "relative", borderRadius: 6, overflow: "hidden" }}
        onMouseEnter={isMobile ? undefined : () => setHovered(true)}
        onMouseLeave={isMobile ? undefined : () => setHovered(false)}
      >
        <button
          onDoubleClick={() => onClick(post)}
          title="Doppelklick zum Veröffentlichen"
          style={{
            width: "100%",
            padding: 0,
            border: "none",
            background: "none",
            cursor: "pointer",
            display: "block",
            outline: "none",
          }}
        >
          <div
            style={{
              position: "relative",
              paddingTop: "56.25%",
              background: "var(--lt-bg-card-2)",
            }}
          >
            <img
              src={post.thumbnailUrl}
              alt={post.title}
              referrerPolicy="no-referrer"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transition: "transform 0.2s",
                transform: hovered ? "scale(1.04)" : "scale(1)",
              }}
            />
            {/* Dark overlay */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: hovered
                  ? "linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)"
                  : "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)",
                transition: "background 0.2s",
              }}
            />
            {/* X border on hover */}
            {hovered && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 6,
                  outline: "2px solid #fff",
                  outlineOffset: "-2px",
                }}
              />
            )}
            {/* Doppelklick-Hint on hover */}
            {hovered && (
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  background: "rgba(0,0,0,0.7)",
                  color: "#fff",
                  fontFamily: "var(--lt-font-mono)",
                  fontSize: "0.6rem",
                  padding: "0.25rem 0.5rem",
                  borderRadius: 4,
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                }}
              >
                Doppelklick zum Veröffentlichen
              </div>
            )}
            {/* X badge */}
            <div
              style={{
                position: "absolute",
                top: 6,
                left: 6,
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: "rgba(0,0,0,0.7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.65rem",
                color: "#fff",
              }}
            >
              𝕏
            </div>
            {/* Caption */}
            <p
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                margin: 0,
                padding: "0.4rem 0.5rem",
                fontFamily: "var(--lt-font-mono)",
                fontSize: "0.6rem",
                color: "#fff",
                lineHeight: 1.4,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {post.title}
            </p>
          </div>
        </button>

        <button
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
      </div>
    );
  }

  // Text-only fallback
  return (
    <div
      style={{ position: "relative" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        onDoubleClick={() => onClick(post)}
        title="Doppelklick zum Veröffentlichen"
        style={{
          width: "100%",
          textAlign: "left",
          display: "block",
          borderRadius: 6,
          border: `1px solid ${hovered ? "var(--lt-accent)" : "var(--lt-border)"}`,
          background: hovered ? "var(--lt-bg-hover)" : "var(--lt-bg-card-2)",
          padding: "0.6rem 0.75rem",
          cursor: "pointer",
          outline: "none",
          transition: "border-color 0.15s, background 0.15s",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            marginBottom: "0.35rem",
          }}
        >
          <span style={{ fontSize: "0.75rem", lineHeight: 1 }}>𝕏</span>
          <span
            style={{
              fontFamily: "var(--lt-font-mono)",
              fontSize: "0.6rem",
              color: "var(--lt-text-muted)",
            }}
          >
            @Eintracht
          </span>
        </div>
        <p
          style={{
            fontFamily: "var(--lt-font-mono)",
            fontSize: "0.68rem",
            color: "var(--lt-text)",
            margin: 0,
            lineHeight: 1.5,
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {post.title}
        </p>
        {post.videoUrl && (
          <a
            href={post.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{
              display: "inline-block",
              marginTop: "0.3rem",
              fontFamily: "var(--lt-font-mono)",
              fontSize: "0.58rem",
              color: "var(--lt-accent)",
              textDecoration: "none",
            }}
          >
            → Original ansehen
          </a>
        )}
      </button>

      <button
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
    </div>
  );
}

// ── Hauptkomponente ───────────────────────────────────────────

interface TwitterPanelProps {
  matchId: number;
  currentMinute?: number;
}

export const TwitterPanel = memo(function TwitterPanel({
  matchId,
  currentMinute = 0,
}: TwitterPanelProps) {
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
  } = useSocialPanel(fetchTwitterPosts, triggerTwitterImport);

  const hasThumbnails = posts.some((p) => p.thumbnailUrl);

  return (
    <>
      {modalPost &&
        createPortal(
          <TwitterPublishModal
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
        icon="𝕏"
        label="Twitter / X"
        badgeCount={posts.length}
        badgeBackground="#000"
        importing={importing}
        loading={loading}
        onImport={handleImport}
        onRefresh={loadPosts}
        importLabel="𝕏 Tweets importieren"
        importBackground="#000"
        emptyLabel="Keine Tweets – erst importieren"
        hintLabel="Doppelklick zum Veröffentlichen"
        statusMsg={statusMsg}
        gridColumns={hasThumbnails ? "1fr 1fr" : "1fr"}
      >
        {posts.map((post) => (
          <TweetCard
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
