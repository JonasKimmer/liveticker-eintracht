// ============================================================
// PublishedEntry.jsx  (React.memo — rendert oft)
// ============================================================
import { memo, useState, useRef } from "react";
import { getEventMeta } from "../utils/parseCommand";

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

  const startEdit = () => {
    setEditText(tickerText?.text ?? "");
    setEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };
  const cancelEdit = () => setEditing(false);
  const saveEdit = async () => {
    if (!onEdit || !tickerText?.id) return;
    setSaving(true);
    try { await onEdit(tickerText.id, editText); setEditing(false); }
    finally { setSaving(false); }
  };

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
      Before: "i", After: "i", Halftime: "i",
      FirstHalfBreak: "i", SecondHalfBreak: "Pause",
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
    // Dedup-Keys (z.B. "pass_h_90") sind kein Emoji → Fallback auf 📊
    const isCodeKey = tickerText?.icon && /^[a-z0-9_]+$/i.test(tickerText.icon);
    const displayIcon = isCodeKey ? "📊" : (tickerText?.icon ?? phaseIcon);
    const minuteDisplay = phaseLabel ?? (tickerText?.minute != null ? `${tickerText.minute}'` : "–");
    return (
      <div className="lt-entry lt-entry--manual">
        <span className="lt-entry__minute">{minuteDisplay}</span>
        {tickerText?.phase !== "Before" && (
          <span className="lt-entry__icon">{tickerText?.video_url && /x\.com|twitter\.com/.test(tickerText.video_url) ? "𝕏" : tickerText?.video_url && /instagram\.com/.test(tickerText.video_url) ? "📸" : tickerText?.video_url && /youtube\.com|youtu\.be/.test(tickerText.video_url) ? "▶" : tickerText?.video_url ? "🎬" : tickerText?.image_url ? "📸" : displayIcon}</span>
        )}
        <div className="lt-entry__body">
          {tickerText?.video_url && /x\.com|twitter\.com/.test(tickerText.video_url) ? (
            <a href={tickerText.video_url} target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontFamily: "var(--lt-font-mono)", fontSize: "0.68rem", color: "var(--lt-accent)", textDecoration: "none", marginBottom: 4 }}>
              <span style={{ fontSize: "0.8rem" }}>𝕏</span> Zum Tweet →
            </a>
          ) : tickerText?.video_url && /instagram\.com/.test(tickerText.video_url) ? (
            <div>
              {tickerText.image_url && (
                <a href={tickerText.video_url} target="_blank" rel="noopener noreferrer" style={{ display: "block", marginBottom: 6 }}>
                  <img
                    src={tickerText.image_url}
                    alt="Instagram"
                    referrerPolicy="no-referrer"
                    style={{ width: "100%", maxWidth: 280, borderRadius: 6, display: "block", objectFit: "cover" }}
                    loading="lazy"
                  />
                </a>
              )}
              <a href={tickerText.video_url} target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontFamily: "var(--lt-font-mono)", fontSize: "0.68rem", color: "var(--lt-accent)", textDecoration: "none", marginBottom: 4 }}>
                <span style={{ fontSize: "0.8rem" }}>📸</span> Zum Instagram-Post →
              </a>
            </div>
          ) : tickerText?.video_url && /youtube\.com|youtu\.be/.test(tickerText.video_url) ? (
            <div>
              {tickerText.image_url && (
                <a href={tickerText.video_url} target="_blank" rel="noopener noreferrer"
                  style={{ display: "inline-block", position: "relative", marginBottom: 6 }}>
                  <img
                    src={tickerText.image_url}
                    alt="YouTube"
                    style={{ width: 280, maxWidth: "100%", borderRadius: 6, display: "block", objectFit: "cover" }}
                    loading="lazy"
                  />
                  <div style={{
                    position: "absolute", top: "50%", left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: 36, height: 36, borderRadius: "50%",
                    background: "rgba(255,0,0,0.85)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    pointerEvents: "none",
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff" style={{ marginLeft: 2 }}>
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                </a>
              )}
              <a href={tickerText.video_url} target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontFamily: "var(--lt-font-mono)", fontSize: "0.68rem", color: "var(--lt-accent)", textDecoration: "none", marginBottom: 4 }}>
                <span style={{ fontSize: "0.8rem" }}>▶</span> Zum YouTube-Video →
              </a>
            </div>
          ) : tickerText?.video_url ? (
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
          {editing ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
              <textarea
                ref={textareaRef}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={3}
                style={{
                  width: "100%", background: "var(--lt-bg-card-2)", border: "1px solid var(--lt-accent)",
                  borderRadius: 6, color: "var(--lt-text)", fontFamily: "var(--lt-font-mono)",
                  fontSize: "0.82rem", padding: "0.5rem 0.6rem", resize: "vertical", outline: "none",
                }}
                onKeyDown={(e) => { if (e.key === "Escape") cancelEdit(); if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) saveEdit(); }}
              />
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={saveEdit} disabled={saving} style={{ padding: "0.25rem 0.7rem", borderRadius: 5, background: "var(--lt-accent)", border: "none", color: "#000", fontFamily: "var(--lt-font-mono)", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
                  {saving ? "…" : "Speichern"}
                </button>
                <button onClick={cancelEdit} style={{ padding: "0.25rem 0.7rem", borderRadius: 5, background: "transparent", border: "1px solid var(--lt-border)", color: "var(--lt-text-muted)", fontFamily: "var(--lt-font-mono)", fontSize: "0.72rem", cursor: "pointer" }}>
                  Abbrechen
                </button>
              </div>
            </div>
          ) : (
            <div className="lt-entry__text" style={{ position: "relative" }}>
              {(() => {
                const hasMedia = tickerText?.video_url || tickerText?.image_url;
                const mediaDefaults = ["🎬", "📷", "📸"];
                const isCodeKey = tickerText?.icon && /^[a-z0-9_]+$/i.test(tickerText.icon);
                const hasCustomIcon = hasMedia && !isCodeKey && tickerText?.icon && !mediaDefaults.includes(tickerText.icon);
                return hasCustomIcon ? tickerText.icon : tickerText?.text;
              })()}
              {onEdit && (
                <button onClick={startEdit} title="Bearbeiten" style={{ marginLeft: 6, background: "none", border: "none", color: "var(--lt-text-faint)", cursor: "pointer", fontSize: "0.75rem", padding: 0, verticalAlign: "middle", opacity: 0.5 }}>✎</button>
              )}
              {onDelete && (
                <button onClick={() => { if (window.confirm("Eintrag löschen?")) onDelete(tickerText?.id); }} title="Löschen" style={{ marginLeft: 4, background: "none", border: "none", color: "var(--lt-text-faint)", cursor: "pointer", fontSize: "0.72rem", padding: 0, verticalAlign: "middle", opacity: 0.4 }}>✕</button>
              )}
            </div>
          )}
          <div className="lt-entry__meta">{tickerText?.video_url && /x\.com|twitter\.com/.test(tickerText.video_url) ? "tweet · manuell" : tickerText?.video_url && /instagram\.com/.test(tickerText.video_url) ? "instagram · manuell" : tickerText?.video_url && /youtube\.com|youtu\.be/.test(tickerText.video_url) ? "youtube · manuell" : tickerText?.video_url ? "clip · manuell" : tickerText?.image_url ? "foto · manuell" : "manuell"}</div>
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
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
            <textarea
              ref={textareaRef}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={3}
              style={{
                width: "100%", background: "var(--lt-bg-card-2)", border: "1px solid var(--lt-accent)",
                borderRadius: 6, color: "var(--lt-text)", fontFamily: "var(--lt-font-mono)",
                fontSize: "0.82rem", padding: "0.5rem 0.6rem", resize: "vertical", outline: "none",
              }}
              onKeyDown={(e) => { if (e.key === "Escape") cancelEdit(); if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) saveEdit(); }}
            />
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={saveEdit} disabled={saving} style={{ padding: "0.25rem 0.7rem", borderRadius: 5, background: "var(--lt-accent)", border: "none", color: "#000", fontFamily: "var(--lt-font-mono)", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
                {saving ? "…" : "Speichern"}
              </button>
              <button onClick={cancelEdit} style={{ padding: "0.25rem 0.7rem", borderRadius: 5, background: "transparent", border: "1px solid var(--lt-border)", color: "var(--lt-text-muted)", fontFamily: "var(--lt-font-mono)", fontSize: "0.72rem", cursor: "pointer" }}>
                Abbrechen
              </button>
            </div>
          </div>
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
