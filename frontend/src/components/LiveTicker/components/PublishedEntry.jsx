// ============================================================
// PublishedEntry.jsx  (React.memo — rendert oft)
// ============================================================
import { memo, useState, useRef } from "react";
import { getEventMeta } from "../utils/parseCommand";

// Inline video player: zeigt Thumbnail → Klick → iframe direkt im Eintrag
function InlineVideo({ videoUrl, thumbnailUrl }) {
  const [playing, setPlaying] = useState(false);

  // Immer 16:9, maxWidth damit es nicht die volle Spalte füllt
  const wrapStyle = {
    position: "relative", width: "100%", maxWidth: 320, paddingBottom: "56.25%",
    borderRadius: 6, overflow: "hidden", marginBottom: 4,
  };
  const fill = { position: "absolute", inset: 0, width: "100%", height: "100%" };

  if (playing) {
    return (
      <div style={wrapStyle}>
        <iframe
          src={videoUrl}
          style={{ ...fill, border: "none", display: "block" }}
          allow="autoplay; fullscreen"
          allowFullScreen
        />
        <button
          onClick={() => setPlaying(false)}
          style={{
            position: "absolute", top: 6, right: 6, zIndex: 1,
            width: 26, height: 26, borderRadius: "50%",
            background: "rgba(0,0,0,0.65)", border: "none",
            color: "#fff", cursor: "pointer", fontSize: "0.7rem",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >✕</button>
      </div>
    );
  }

  return (
    <div style={{ ...wrapStyle, cursor: "pointer" }} onClick={() => setPlaying(true)}>
      {thumbnailUrl ? (
        <img src={thumbnailUrl} alt="Clip" style={{ ...fill, objectFit: "cover", display: "block" }} />
      ) : (
        <div style={{ ...fill, background: "var(--lt-bg-card-2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: "1.5rem" }}>🎬</span>
        </div>
      )}
      <div style={{ ...fill, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.3)" }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: "1rem", marginLeft: 3 }}>▶</span>
        </div>
      </div>
    </div>
  );
}

export const PublishedEntry = memo(function PublishedEntry({
  entry,
  tickerText,
  isManual,
  isPrematch,
}) {
  const eventType = entry?.liveTickerEventType ?? entry?.event_type ?? entry?.type;
  const { icon, cssClass } = getEventMeta(eventType, entry?.detail);

  if (isPrematch) {
    return (
      <div className="lt-entry lt-entry--pre">
        <span className="lt-entry__minute lt-entry__minute--pre">Vor</span>
        <span className="lt-entry__icon">📣</span>
        <div className="lt-entry__body">
          <div className="lt-entry__text">{tickerText?.text}</div>
          <div className="lt-entry__meta">{tickerText?.llm_model}</div>
        </div>
      </div>
    );
  }

  if (isManual) {
    const phaseLabel = {
      Before: "i", After: "Nach",
      FirstHalfBreak: "HZ", SecondHalfBreak: "Pause",
      ExtraBreak: "VZ·P", ExtraSecondHalfBreak: "Elfm.P",
      ExtraFirstHalf: "VZ1", ExtraSecondHalf: "VZ2",
      PenaltyShootout: "Elfm.",
    }[tickerText?.phase];
    const phaseIcon = {
      FirstHalf: "📣", SecondHalf: "📣",
      ExtraFirstHalf: "📣", ExtraSecondHalf: "📣",
      FirstHalfBreak: "🔔", SecondHalfBreak: "🔔", ExtraBreak: "🔔",
      After: "📣", PenaltyShootout: "🥅",
    }[tickerText?.phase] ?? icon ?? "•";
    const minuteDisplay = phaseLabel
      ?? (tickerText?.minute != null ? `${tickerText.minute}'` : "–");
    return (
      <div className="lt-entry lt-entry--manual">
        <span className="lt-entry__minute">{minuteDisplay}</span>
        {tickerText?.phase !== "Before" && (
          <span className="lt-entry__icon">{tickerText?.video_url ? "🎬" : (tickerText?.image_url ? "📸" : (tickerText?.icon ?? phaseIcon))}</span>
        )}
        <div className="lt-entry__body">
          {tickerText?.video_url ? (
            <InlineVideo videoUrl={tickerText.video_url} thumbnailUrl={tickerText.image_url} />
          ) : tickerText?.image_url && (
            <img
              src={tickerText.image_url}
              alt="Ticker-Bild"
              className="lt-entry__image"
              loading="lazy"
              onDoubleClick={() => window.dispatchEvent(new CustomEvent("lt-show-commands"))}
              style={{ cursor: "pointer" }}
            />
          )}
          <div className="lt-entry__text">{tickerText?.text}</div>
          <div className="lt-entry__meta">{tickerText?.video_url ? "clip · manuell" : (tickerText?.image_url ? "foto · manuell" : "manuell")}</div>
        </div>
      </div>
    );
  }

  if (!tickerText) return null;

  return (
    <div className={`lt-entry${cssClass ? ` lt-entry--${cssClass}` : ""}`}>
      <span className="lt-entry__minute">{entry.time ?? entry.minute}'</span>
      <span className="lt-entry__icon">{icon}</span>
      <div className="lt-entry__body">
        <div className="lt-entry__text">{tickerText.text}</div>
        <div className="lt-entry__meta">
          {tickerText.style} · {tickerText.llm_model}
        </div>
      </div>
    </div>
  );
});
