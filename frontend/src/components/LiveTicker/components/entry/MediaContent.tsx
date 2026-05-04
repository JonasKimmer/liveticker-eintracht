// ============================================================
// MediaContent.tsx — Renders Twitter/Instagram/YouTube embeds,
//                    inline video, and images
// ============================================================
import React, { useRef, useEffect } from "react";
import { URL_PATTERNS } from "../../constants";

// Inline video player — direkte MP4-URLs (S3 Torjubel)
// useRef + .play() weil Browser autoPlay-Attribut oft ignorieren
function InlineVideo({
  videoUrl,
  thumbnailUrl,
}: {
  videoUrl: string;
  thumbnailUrl?: string | null;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.play().catch(() => {});
  }, [videoUrl]);
  return (
    <div className="lt-video-wrap">
      <video
        ref={ref}
        src={videoUrl}
        poster={thumbnailUrl ?? undefined}
        loop
        muted
        playsInline
        controls
        style={{ width: "100%", display: "block", borderRadius: 4 }}
      />
    </div>
  );
}

export interface MediaContentProps {
  videoUrl?: string | null;
  imageUrl?: string | null;
}

export function MediaContent({ videoUrl, imageUrl }: MediaContentProps) {
  if (!videoUrl && !imageUrl) return null;
  if (videoUrl && URL_PATTERNS.twitter.test(videoUrl)) {
    return (
      <a
        href={videoUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="lt-entry__media-link"
      >
        <span className="lt-entry__media-link-icon">𝕏</span> Zum Tweet →
      </a>
    );
  }
  if (videoUrl && URL_PATTERNS.instagram.test(videoUrl)) {
    return (
      <div>
        {imageUrl && (
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="lt-entry__media-thumb--linked"
          >
            <img
              src={imageUrl}
              alt="Instagram"
              referrerPolicy="no-referrer"
              className="lt-entry__media-thumb"
              loading="lazy"
            />
          </a>
        )}
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="lt-entry__media-link"
        >
          <span className="lt-entry__media-link-icon">📸</span> Zum
          Instagram-Post →
        </a>
      </div>
    );
  }
  if (videoUrl && URL_PATTERNS.youtube.test(videoUrl)) {
    return (
      <div>
        {imageUrl && (
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="lt-entry__media-thumb--linked"
          >
            <img
              src={imageUrl}
              alt="YouTube"
              className="lt-entry__media-thumb"
              loading="lazy"
            />
          </a>
        )}
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="lt-entry__media-link"
        >
          <span className="lt-entry__media-link-icon">▶</span> Zum YouTube-Video
          →
        </a>
      </div>
    );
  }
  if (videoUrl) {
    return <InlineVideo videoUrl={videoUrl} thumbnailUrl={imageUrl} />;
  }
  return (
    <img
      src={imageUrl}
      alt="Ticker-Bild"
      className="lt-entry__image"
      loading="lazy"
      onDoubleClick={() =>
        window.dispatchEvent(new CustomEvent("lt-show-commands"))
      }
    />
  );
}
