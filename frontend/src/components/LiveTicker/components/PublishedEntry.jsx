// ============================================================
// PublishedEntry.jsx  (React.memo — rendert oft)
// ============================================================
import { memo, useState, useCallback, useRef, useEffect } from "react";
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

// Inline video player — direkte MP4-URLs (S3 Torjubel)
// useRef + .play() weil Browser autoPlay-Attribut oft ignorieren
function InlineVideo({ videoUrl }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.play().catch(() => {});
  }, [videoUrl]);
  return (
    <div className="lt-video-wrap">
      <video
        ref={ref}
        src={videoUrl}
        loop
        muted
        playsInline
        controls
        style={{ width: "100%", display: "block", borderRadius: 4 }}
      />
    </div>
  );
}

InlineVideo.propTypes = {
  videoUrl: PropTypes.string.isRequired,
};

function MediaContent({ videoUrl, imageUrl }) {
  if (!videoUrl && !imageUrl) return null;
  if (videoUrl && URL_PATTERNS.twitter.test(videoUrl)) {
    return <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="lt-entry__media-link"><span className="lt-entry__media-link-icon">𝕏</span> Zum Tweet →</a>;
  }
  if (videoUrl && URL_PATTERNS.instagram.test(videoUrl)) {
    return (
      <div>
        {imageUrl && <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="lt-entry__media-thumb--linked"><img src={imageUrl} alt="Instagram" referrerPolicy="no-referrer" className="lt-entry__media-thumb" loading="lazy" /></a>}
        <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="lt-entry__media-link"><span className="lt-entry__media-link-icon">📸</span> Zum Instagram-Post →</a>
      </div>
    );
  }
  if (videoUrl && URL_PATTERNS.youtube.test(videoUrl)) {
    return (
      <div>
        {imageUrl && <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="lt-entry__media-thumb--linked"><img src={imageUrl} alt="YouTube" className="lt-entry__media-thumb" loading="lazy" /></a>}
        <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="lt-entry__media-link"><span className="lt-entry__media-link-icon">▶</span> Zum YouTube-Video →</a>
      </div>
    );
  }
  if (videoUrl) {
    return <InlineVideo videoUrl={videoUrl} thumbnailUrl={imageUrl} />;
  }
  return (
    <img src={imageUrl} alt="Ticker-Bild" className="lt-entry__image" loading="lazy"
      onDoubleClick={() => window.dispatchEvent(new CustomEvent("lt-show-commands"))}
    />
  );
}

MediaContent.propTypes = {
  videoUrl: PropTypes.string,
  imageUrl: PropTypes.string,
};

const MEDIA_DEFAULT_ICONS = ["🎬", "📷", "📸"];

function EntryActions({ onEdit, onDelete, tickerTextId, startEdit }) {
  return (
    <>
      {onEdit && (
        <button onClick={startEdit} title="Bearbeiten" className="lt-entry__action-btn lt-entry__action-btn--edit">✎</button>
      )}
      {onDelete && (
        <button onClick={() => { if (window.confirm("Eintrag löschen?")) onDelete(tickerTextId); }} title="Löschen" className="lt-entry__action-btn lt-entry__action-btn--delete">✕</button>
      )}
    </>
  );
}

function getDisplayText(tickerText) {
  const hasMedia = tickerText?.video_url || tickerText?.image_url;
  const isCodeKey = tickerText?.icon && /^[a-z0-9_]+$/i.test(tickerText.icon);
  const hasCustomIcon = hasMedia && !isCodeKey && tickerText?.icon && !MEDIA_DEFAULT_ICONS.includes(tickerText.icon);
  return hasCustomIcon ? `${tickerText.icon} ${tickerText?.text}` : tickerText?.text;
}

function EditForm({ textareaRef, value, onChange, onSave, onCancel, saving }) {
  return (
    <div className="lt-entry__edit-form">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="lt-entry__edit-textarea"
        onKeyDown={(e) => { if (e.key === "Escape") onCancel(); if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) onSave(); }}
      />
      <div className="lt-entry__edit-actions">
        <button onClick={onSave} disabled={saving} className="lt-entry__edit-save">
          {saving ? "…" : "Speichern"}
        </button>
        <button onClick={onCancel} className="lt-entry__edit-cancel">Abbrechen</button>
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
      [MATCH_PHASES.BEFORE]:                  "i",
      [MATCH_PHASES.AFTER]:                   "i",
      [MATCH_PHASES.FULL_TIME]:               "FT",
      [MATCH_PHASES.HALFTIME]:                "HZ",
      [MATCH_PHASES.FIRST_HALF_BREAK]:        "HZ",
      [MATCH_PHASES.SECOND_HALF]:             "Anstoß",
      [MATCH_PHASES.SECOND_HALF_BREAK]:       "Pause",
      [MATCH_PHASES.EXTRA_BREAK]:             "VZ·P",
      [MATCH_PHASES.EXTRA_SECOND_HALF_BREAK]: "Elfm.P",
      [MATCH_PHASES.EXTRA_FIRST_HALF]:        "VZ1",
      [MATCH_PHASES.EXTRA_SECOND_HALF]:       "VZ2",
      [MATCH_PHASES.PENALTY_SHOOTOUT]:        "Elfm.",
    }[tickerText?.phase];
    const phaseIcon = {
      [MATCH_PHASES.FIRST_HALF]:              "📣",
      [MATCH_PHASES.SECOND_HALF]:             "📣",
      [MATCH_PHASES.EXTRA_FIRST_HALF]:        "📣",
      [MATCH_PHASES.EXTRA_SECOND_HALF]:       "📣",
      [MATCH_PHASES.FIRST_HALF_BREAK]:        "📣",
      [MATCH_PHASES.SECOND_HALF_BREAK]:       "📣",
      [MATCH_PHASES.EXTRA_BREAK]:             "📣",
      [MATCH_PHASES.AFTER]:                   "📣",
      [MATCH_PHASES.FULL_TIME]:               "📣",
      [MATCH_PHASES.PENALTY_SHOOTOUT]:        "🥅",
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
            <div className="lt-entry__text">
              {getDisplayText(tickerText)}
              <EntryActions onEdit={onEdit} onDelete={onDelete} tickerTextId={tickerText?.id} startEdit={startEdit} />
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
          <div className="lt-entry__text">
            {tickerText.text}
            <EntryActions onEdit={onEdit} onDelete={onDelete} tickerTextId={tickerText?.id} startEdit={startEdit} />
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
