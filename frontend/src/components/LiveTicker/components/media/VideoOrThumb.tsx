import { useState } from "react";

interface VideoOrThumbClip {
  video_url?: string | null;
  thumbnail_url?: string | null;
  title?: string | null;
  player_name?: string | null;
  team_name?: string | null;
}

export function VideoOrThumb({ clip }: { clip: VideoOrThumbClip }) {
  const [playing, setPlaying] = useState(false);

  if (playing && clip.video_url) {
    return (
      <div
        style={{
          position: "relative",
          paddingBottom: "56.25%",
          background: "#000",
        }}
      >
        <iframe
          src={clip.video_url}
          title="Clip Player"
          allow="autoplay; fullscreen"
          allowFullScreen
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            border: "none",
          }}
        />
        <div
          onClick={() => setPlaying(false)}
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            zIndex: 10,
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: "rgba(0,0,0,0.6)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontSize: "0.75rem",
          }}
        >
          ✕
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => clip.video_url && setPlaying(true)}
      style={{
        position: "relative",
        paddingBottom: "56.25%",
        overflow: "hidden",
        cursor: clip.video_url ? "pointer" : "default",
      }}
    >
      {clip.thumbnail_url && (
        <img
          src={clip.thumbnail_url}
          alt={clip.title ?? "Clip"}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to top, var(--lt-bg-card) 0%, transparent 60%)",
        }}
      />
      {clip.video_url && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "rgba(0,0,0,0.65)",
              border: "2px solid rgba(255,255,255,0.8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ color: "#fff", fontSize: "1.1rem", marginLeft: 3 }}>
              ▶
            </span>
          </div>
          <a
            href={clip.video_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "rgba(0,0,0,0.65)",
              border: "2px solid rgba(255,255,255,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: "0.75rem",
              textDecoration: "none",
            }}
            title="In neuem Tab öffnen"
          >
            ↗
          </a>
        </div>
      )}
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
        {clip.player_name ? `⚽ ${clip.player_name}` : (clip.title ?? "Clip")}
        {clip.team_name && (
          <span style={{ opacity: 0.7 }}> · {clip.team_name}</span>
        )}
      </span>
    </div>
  );
}
