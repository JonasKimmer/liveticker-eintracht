import { useState } from "react";

interface ClipThumbnailProps {
  clip: {
    id: string | number;
    player_name?: string | null;
    title?: string | null;
    thumbnail_url?: string | null;
    team_name?: string | null;
  };
  onClick: (clip: ClipThumbnailProps["clip"]) => void;
  onDelete: (id: string | number) => void;
}

export function ClipThumbnail({ clip, onClick, onDelete }: ClipThumbnailProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => onClick(clip)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 6,
          border: `1px solid ${hovered ? "var(--lt-accent)" : "var(--lt-border)"}`,
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
        {clip.thumbnail_url ? (
          <img
            src={clip.thumbnail_url}
            alt={clip.player_name ?? "Clip"}
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
            🎬
          </div>
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: hovered ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0.2)",
            transition: "background 0.15s",
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: hovered
                ? "var(--lt-accent)"
                : "rgba(255,255,255,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.15s",
            }}
          >
            <span
              style={{
                fontSize: "0.7rem",
                marginLeft: 2,
                color: hovered ? "#0d0d0d" : "#fff",
              }}
            >
              ▶
            </span>
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            background: "linear-gradient(transparent, rgba(0,0,0,0.8))",
            padding: "8px 6px 4px",
          }}
        >
          <p
            style={{
              fontFamily: "var(--lt-font-mono)",
              fontSize: "0.6rem",
              color: "#fff",
              margin: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {clip.player_name ?? clip.title ?? "Clip"}
          </p>
          {clip.team_name && (
            <p
              style={{
                fontFamily: "var(--lt-font-mono)",
                fontSize: "0.55rem",
                color: "rgba(255,255,255,0.6)",
                margin: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {clip.team_name}
            </p>
          )}
        </div>
      </button>
      {/* Löschen-Button */}
      <button
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
        title="Clip löschen"
      >
        ✕
      </button>
    </div>
  );
}
