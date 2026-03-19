// ============================================================
// PublishedEntry.jsx  (React.memo — rendert oft)
// ============================================================
import { memo, useState, useCallback, useRef } from "react";
import PropTypes from "prop-types";
import { getEventMeta } from "../utils/parseCommand";
import { MATCH_PHASES } from "../constants";

const URL_PATTERNS = {
  twitter: /x\.com|twitter\.com/,
  instagram: /instagram\.com/,
  youtube: /youtube\.com|youtu\.be/,
};

function getMediaIcon(videoUrl, imageUrl, fallback) {
  if (!videoUrl && !imageUrl) return fallback;
  if (videoUrl && URL_PATTERNS.twitter.test(videoUrl)) return "𝕏";
  if (videoUrl && URL_PATTERNS.instagram.test(videoUrl)) return "📸";
  if (videoUrl && URL_PATTERNS.youtube.test(videoUrl)) return "▶";
  if (videoUrl) return "🎬";
  return "📸";
}

function getMediaLabel(videoUrl, imageUrl) {
  if (videoUrl && URL_PATTERNS.twitter.test(videoUrl)) return "tweet · manuell";
  if (videoUrl && URL_PATTERNS.instagram.test(videoUrl)) return "instagram · manuell";
  if (videoUrl && URL_PATTERNS.youtube.test(videoUrl)) return "youtube · manuell";
  if (videoUrl) return "clip · manuell";
  if (imageUrl) return "foto · manuell";
  return "manuell";
}

// YouTube watch-URL → embed-URL umwandeln
function toEmbedUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") && u.searchParams.get("v")) {
      return `https://www.youtube.com/embed/${u.searchParams.get("v")}?autoplay=1`;
    }
    if (u.hostname === "youtu.be") {
      return `https://www.youtube.com/embed${u.pathname}?autoplay=1`;
    }
  } catch { /* noop */ }
  return url;
}

// Inline video player: zeigt Thumbnail → Klick → iframe direkt im Eintrag
function InlineVideo({ videoUrl, thumbnailUrl }) {
  const [playing, setPlaying] = useState(false);
  const embedUrl = toEmbedUrl(videoUrl);

  const wrapStyle = {
    position: "relative", width: "100%", maxWidth: 320, aspectRatio: "16/9",
    borderRadius: 6, overflow: "hidden", marginBottom: 4,
  };

  if (playing) {
    return (
      <div style={wrapStyle}>
        <iframe
          src={embedUrl}
          style={{ width: "100%", height: "100%", border: "none", display: "block" }}
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
        <img src={thumbnailUrl} alt="Clip" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      ) : (
        <div style={{ width: "100%", height: "100%", background: "var(--lt-bg-card-2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: "1.5rem" }}>🎬</span>
        </div>
      )}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.3)" }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: "1rem", marginLeft: 3 }}>▶</span>
        </div>
      </div>
    </div>
  );
}

InlineVideo.propTypes = {
  videoUrl: PropTypes.string.isRequired,
  thumbnailUrl: PropTypes.string,
};

const LINK_STYLE = { display: "inline-flex", alignItems: "center", gap: "0.35rem", fontFamily: "var(--lt-font-mono)", fontSize: "0.68rem", color: "var(--lt-accent)", textDecoration: "none", marginBottom: 4 };
const THUMB_STYLE = { width: "100%", maxWidth: 280, borderRadius: 6, display: "block", objectFit: "cover" };

function MediaContent({ videoUrl, imageUrl }) {
  if (!videoUrl && !imageUrl) return null;
  if (videoUrl && URL_PATTERNS.twitter.test(videoUrl)) {
    return <a href={videoUrl} target="_blank" rel="noopener noreferrer" style={LINK_STYLE}><span style={{ fontSize: "0.8rem" }}>𝕏</span> Zum Tweet →</a>;
  }
  if (videoUrl && URL_PATTERNS.instagram.test(videoUrl)) {
    return (
      <div>
        {imageUrl && <a href={videoUrl} target="_blank" rel="noopener noreferrer" style={{ display: "block", marginBottom: 6 }}><img src={imageUrl} alt="Instagram" referrerPolicy="no-referrer" style={THUMB_STYLE} loading="lazy" /></a>}
        <a href={videoUrl} target="_blank" rel="noopener noreferrer" style={LINK_STYLE}><span style={{ fontSize: "0.8rem" }}>📸</span> Zum Instagram-Post →</a>
      </div>
    );
  }
  if (videoUrl && URL_PATTERNS.youtube.test(videoUrl)) {
    return (
      <div>
        {imageUrl && <a href={videoUrl} target="_blank" rel="noopener noreferrer" style={{ display: "block", position: "relative", marginBottom: 6 }}><img src={imageUrl} alt="YouTube" style={THUMB_STYLE} loading="lazy" /></a>}
        <a href={videoUrl} target="_blank" rel="noopener noreferrer" style={LINK_STYLE}><span style={{ fontSize: "0.8rem" }}>▶</span> Zum YouTube-Video →</a>
      </div>
    );
  }
  if (videoUrl) {
    return <InlineVideo videoUrl={videoUrl} thumbnailUrl={imageUrl} />;
  }
  return (
    <img src={imageUrl} alt="Ticker-Bild" className="lt-entry__image" loading="lazy"
      onDoubleClick={() => window.dispatchEvent(new CustomEvent("lt-show-commands"))}
      style={{ cursor: "pointer" }}
    />
  );
}

MediaContent.propTypes = {
  videoUrl: PropTypes.string,
  imageUrl: PropTypes.string,
};

const MEDIA_DEFAULT_ICONS = ["🎬", "📷", "📸"];

function getDisplayText(tickerText) {
  const hasMedia = tickerText?.video_url || tickerText?.image_url;
  const isCodeKey = tickerText?.icon && /^[a-z0-9_]+$/i.test(tickerText.icon);
  const hasCustomIcon = hasMedia && !isCodeKey && tickerText?.icon && !MEDIA_DEFAULT_ICONS.includes(tickerText.icon);
  return hasCustomIcon ? `${tickerText.icon} ${tickerText?.text}` : tickerText?.text;
}

function EditForm({ textareaRef, value, onChange, onSave, onCancel, saving }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        style={{
          width: "100%", background: "var(--lt-bg-card-2)", border: "1px solid var(--lt-accent)",
          borderRadius: 6, color: "var(--lt-text)", fontFamily: "var(--lt-font-mono)",
          fontSize: "0.82rem", padding: "0.5rem 0.6rem", resize: "vertical", outline: "none",
        }}
        onKeyDown={(e) => { if (e.key === "Escape") onCancel(); if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) onSave(); }}
      />
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={onSave} disabled={saving} style={{ padding: "0.25rem 0.7rem", borderRadius: 5, background: "var(--lt-accent)", border: "none", color: "#000", fontFamily: "var(--lt-font-mono)", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
          {saving ? "…" : "Speichern"}
        </button>
        <button onClick={onCancel} style={{ padding: "0.25rem 0.7rem", borderRadius: 5, background: "transparent", border: "1px solid var(--lt-border)", color: "var(--lt-text-muted)", fontFamily: "var(--lt-font-mono)", fontSize: "0.72rem", cursor: "pointer" }}>
          Abbrechen
        </button>
      </div>
    </div>
  );
}

EditForm.propTypes = {
  textareaRef: PropTypes.object.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  saving: PropTypes.bool.isRequired,
};

export const PublishedEntry = memo(function PublishedEntry({
  entry,
  tickerText,
  isManual,
  isPrematch,
  onEdit,
  onDelete,
}) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef(null);

  const startEdit = useCallback(() => {
    setEditText(tickerText?.text ?? "");
    setEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, [tickerText?.text]);
  const cancelEdit = useCallback(() => setEditing(false), []);
  const saveEdit = useCallback(async () => {
    if (!onEdit || !tickerText?.id) return;
    setSaving(true);
    try { await onEdit(tickerText.id, editText); setEditing(false); }
    finally { setSaving(false); }
  }, [onEdit, tickerText?.id, editText]);

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
      [MATCH_PHASES.BEFORE]: "i",
      [MATCH_PHASES.AFTER]: "i",
      [MATCH_PHASES.HALFTIME]: "i",
      [MATCH_PHASES.FIRST_HALF_BREAK]: "i",
      [MATCH_PHASES.SECOND_HALF_BREAK]: "Pause",
      [MATCH_PHASES.EXTRA_BREAK]: "VZ·P",
      [MATCH_PHASES.EXTRA_SECOND_HALF_BREAK]: "Elfm.P",
      [MATCH_PHASES.EXTRA_FIRST_HALF]: "VZ1",
      [MATCH_PHASES.EXTRA_SECOND_HALF]: "VZ2",
      [MATCH_PHASES.PENALTY_SHOOTOUT]: "Elfm.",
    }[tickerText?.phase];
    const phaseIcon = {
      [MATCH_PHASES.FIRST_HALF]: "📣",
      [MATCH_PHASES.SECOND_HALF]: "📣",
      [MATCH_PHASES.EXTRA_FIRST_HALF]: "📣",
      [MATCH_PHASES.EXTRA_SECOND_HALF]: "📣",
      [MATCH_PHASES.FIRST_HALF_BREAK]: "🔔",
      [MATCH_PHASES.SECOND_HALF_BREAK]: "🔔",
      [MATCH_PHASES.EXTRA_BREAK]: "🔔",
      [MATCH_PHASES.AFTER]: "📣",
      [MATCH_PHASES.PENALTY_SHOOTOUT]: "🥅",
    }[tickerText?.phase] ?? icon ?? "•";
    // Dedup-Keys (z.B. "pass_h_90") sind kein Emoji → Fallback auf 📊
    const isCodeKey = tickerText?.icon && /^[a-z0-9_]+$/i.test(tickerText.icon);
    const displayIcon = isCodeKey ? "📊" : (tickerText?.icon ?? phaseIcon);
    const minuteDisplay = phaseLabel ?? (tickerText?.minute != null ? `${tickerText.minute}'` : "–");
    return (
      <div className="lt-entry lt-entry--manual">
        <span className="lt-entry__minute">{minuteDisplay}</span>
        {tickerText?.phase !== "Before" && (
          <span className="lt-entry__icon">{getMediaIcon(tickerText?.video_url, tickerText?.image_url, displayIcon)}</span>
        )}
        <div className="lt-entry__body">
          <MediaContent videoUrl={tickerText?.video_url} imageUrl={tickerText?.image_url} />
          {editing ? (
            <EditForm textareaRef={textareaRef} value={editText} onChange={setEditText} onSave={saveEdit} onCancel={cancelEdit} saving={saving} />
          ) : (
            <div className="lt-entry__text" style={{ position: "relative" }}>
              {getDisplayText(tickerText)}
              {onEdit && (
                <button onClick={startEdit} title="Bearbeiten" style={{ marginLeft: 6, background: "none", border: "none", color: "var(--lt-text-faint)", cursor: "pointer", fontSize: "0.75rem", padding: 0, verticalAlign: "middle", opacity: 0.5 }}>✎</button>
              )}
              {onDelete && (
                <button onClick={() => { if (window.confirm("Eintrag löschen?")) onDelete(tickerText?.id); }} title="Löschen" style={{ marginLeft: 4, background: "none", border: "none", color: "var(--lt-text-faint)", cursor: "pointer", fontSize: "0.72rem", padding: 0, verticalAlign: "middle", opacity: 0.4 }}>✕</button>
              )}
            </div>
          )}
          <div className="lt-entry__meta">{getMediaLabel(tickerText?.video_url, tickerText?.image_url)}</div>
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
        {editing ? (
          <EditForm textareaRef={textareaRef} value={editText} onChange={setEditText} onSave={saveEdit} onCancel={cancelEdit} saving={saving} />
        ) : (
          <div className="lt-entry__text" style={{ position: "relative" }}>
            {tickerText.text}
            {onEdit && (
              <button onClick={startEdit} title="Bearbeiten" style={{ marginLeft: 6, background: "none", border: "none", color: "var(--lt-text-faint)", cursor: "pointer", fontSize: "0.75rem", padding: 0, verticalAlign: "middle", opacity: 0.5 }}>✎</button>
            )}
            {onDelete && (
              <button onClick={() => { if (window.confirm("Eintrag löschen?")) onDelete(tickerText?.id); }} title="Löschen" style={{ marginLeft: 4, background: "none", border: "none", color: "var(--lt-text-faint)", cursor: "pointer", fontSize: "0.72rem", padding: 0, verticalAlign: "middle", opacity: 0.4 }}>✕</button>
            )}
          </div>
        )}
        <div className="lt-entry__meta">
          {tickerText.style} · {tickerText.llm_model}
        </div>
      </div>
    </div>
  );
});

PublishedEntry.propTypes = {
  entry: PropTypes.shape({
    liveTickerEventType: PropTypes.string,
    event_type: PropTypes.string,
    type: PropTypes.string,
    detail: PropTypes.string,
    time: PropTypes.number,
    minute: PropTypes.number,
  }),
  tickerText: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    text: PropTypes.string,
    style: PropTypes.string,
    llm_model: PropTypes.string,
    phase: PropTypes.string,
    minute: PropTypes.number,
    icon: PropTypes.string,
    video_url: PropTypes.string,
    image_url: PropTypes.string,
  }),
  isManual: PropTypes.bool,
  isPrematch: PropTypes.bool,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
};
