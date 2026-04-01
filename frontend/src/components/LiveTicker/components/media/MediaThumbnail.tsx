import { useState, useRef } from "react";
import { createPortal } from "react-dom";

interface MediaItem {
  thumbnail_url?: string | null;
  name?: string | null;
  media_id: string | number;
}

interface MediaThumbnailProps {
  item: MediaItem;
  onDoubleClick: (item: MediaItem) => void;
}

export function MediaThumbnail({ item, onDoubleClick }: MediaThumbnailProps) {
  const [hovered, setHovered] = useState(false);
  const [previewStyle, setPreviewStyle] = useState(null);
  const btnRef = useRef(null);

  function handleMouseEnter() {
    setHovered(true);
    if (btnRef.current && item.thumbnail_url) {
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
        onDoubleClick={() => onDoubleClick(item)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        title="Doppelklick zum Veröffentlichen"
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
        {item.thumbnail_url ? (
          <img
            src={item.thumbnail_url}
            alt={item.name || "Bild"}
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
            kein Vorschaubild
          </div>
        )}
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
                fontSize: "0.65rem",
                fontWeight: 700,
                color: "var(--lt-accent)",
                background: "rgba(0,0,0,0.6)",
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
            background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
            padding: "10px 6px 4px",
          }}
        >
          <p
            style={{
              fontFamily: "var(--lt-font-mono)",
              fontSize: "0.6rem",
              color: "var(--lt-text-muted)",
              margin: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {item.name || `ID ${item.media_id}`}
          </p>
        </div>
      </button>

      {previewStyle &&
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
              src={item.thumbnail_url}
              alt={item.name || "Bild"}
              style={{ width: "100%", display: "block", objectFit: "cover" }}
            />
            {item.name && (
              <div
                style={{
                  background: "var(--lt-bg-card)",
                  padding: "6px 10px",
                  fontFamily: "var(--lt-font-mono)",
                  fontSize: "0.65rem",
                  color: "var(--lt-text-muted)",
                }}
              >
                {item.name}
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
