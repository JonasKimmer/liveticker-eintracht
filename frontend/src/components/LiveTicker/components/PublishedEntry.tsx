// ============================================================
// PublishedEntry.jsx  (React.memo — rendert oft)
// ============================================================
import { memo, useState, useCallback, useRef, useEffect } from "react";
import { getEventMeta } from "../utils/parseCommand";
import {
  MEDIA_DEFAULT_ICONS,
  URL_PATTERNS,
  PHASE_SHORT_LABEL,
  PHASE_DEFAULT_ICON,
} from "../constants";
import { useClickOutside } from "hooks/useClickOutside";

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
  if (videoUrl && URL_PATTERNS.instagram.test(videoUrl))
    return "instagram · manuell";
  if (videoUrl && URL_PATTERNS.youtube.test(videoUrl))
    return "youtube · manuell";
  if (videoUrl) return "clip · manuell";
  if (imageUrl) return "foto · manuell";
  return "manuell";
}

// Inline video player — direkte MP4-URLs (S3 Torjubel)
// useRef + .play() weil Browser autoPlay-Attribut oft ignorieren
function InlineVideo({ videoUrl }: any) {
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

function MediaContent({ videoUrl, imageUrl }: any) {
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

// Drei-Punkte-Menü für Bearbeiten / Löschen
function EntryMenu({ onEdit, onDelete, tickerTextId, startEdit }: any) {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const menuRef = useRef(null);
  const close = useCallback(() => {
    setOpen(false);
    setConfirmOpen(false);
  }, []);
  useClickOutside(menuRef, close);

  if (!onEdit && !onDelete) return null;

  return (
    <div
      className={`lt-entry__menu${open ? " lt-entry__menu--open" : ""}`}
      ref={menuRef}
    >
      <button
        className="lt-entry__menu-btn"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        title="Aktionen"
      >
        •••
      </button>
      {open && (
        <div className="lt-entry__menu-dropdown">
          {!confirmOpen ? (
            <>
              {onEdit && (
                <button
                  className="lt-entry__menu-item"
                  onClick={() => { setOpen(false); startEdit(); }}
                >
                  ✎ Bearbeiten
                </button>
              )}
              {onDelete && (
                <button
                  className="lt-entry__menu-item lt-entry__menu-item--danger"
                  onClick={() => setConfirmOpen(true)}
                >
                  ✕ Löschen
                </button>
              )}
            </>
          ) : (
            <div className="lt-entry__menu-confirm-view">
              <div className="lt-entry__menu-confirm-title">Eintrag löschen?</div>
              <div className="lt-entry__menu-confirm-btns">
                <button
                  className="lt-entry__menu-confirm__btn lt-entry__menu-confirm__btn--ok"
                  onClick={() => { onDelete(tickerTextId); setOpen(false); setConfirmOpen(false); }}
                >
                  Löschen
                </button>
                <button
                  className="lt-entry__menu-confirm__btn lt-entry__menu-confirm__btn--cancel"
                  onClick={() => setConfirmOpen(false)}
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getDisplayText(tickerText) {
  const hasMedia = tickerText?.video_url || tickerText?.image_url;
  const isCodeKey = tickerText?.icon && /^[a-z0-9_]+$/i.test(tickerText.icon);
  const hasCustomIcon =
    hasMedia &&
    !isCodeKey &&
    tickerText?.icon &&
    !MEDIA_DEFAULT_ICONS.includes(tickerText.icon);
  return hasCustomIcon
    ? `${tickerText.icon} ${tickerText?.text}`
    : tickerText?.text;
}

function EditForm({ textareaRef, value, onChange, onSave, onCancel, saving }: any) {
  return (
    <div className="lt-entry__edit-form">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="lt-entry__edit-textarea"
        onKeyDown={(e) => {
          if (e.key === "Escape") onCancel();
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) onSave();
        }}
      />
      <div className="lt-entry__edit-actions">
        <button
          onClick={onSave}
          disabled={saving}
          className="lt-entry__edit-save"
        >
          {saving ? "…" : "Speichern"}
        </button>
        <button onClick={onCancel} className="lt-entry__edit-cancel">
          Abbrechen
        </button>
      </div>
    </div>
  );
}

export const PublishedEntry: any = memo<any>(function PublishedEntry({
  entry,
  tickerText,
  isManual,
  isPrematch,
  onEdit,
  onDelete,
}: any) {
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
    try {
      await onEdit(tickerText.id, editText);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }, [onEdit, tickerText?.id, editText]);

  const eventType =
    entry?.liveTickerEventType ?? entry?.event_type ?? entry?.type;
  const { icon, cssClass } = getEventMeta(eventType, entry?.detail);

  if (isPrematch) {
    return (
      <div className="lt-entry lt-entry--pre">
        <span className="lt-entry__minute lt-entry__minute--pre">Vor</span>
        <span className="lt-entry__icon">📣</span>
        <div className="lt-entry__body">
          {editing ? (
            <EditForm
              textareaRef={textareaRef}
              value={editText}
              onChange={setEditText}
              onSave={saveEdit}
              onCancel={cancelEdit}
              saving={saving}
            />
          ) : (
            <div className="lt-entry__text">{tickerText?.text}</div>
          )}
          <div className="lt-entry__meta">{tickerText?.llm_model}</div>
        </div>
        <EntryMenu
          onEdit={onEdit}
          onDelete={onDelete}
          tickerTextId={tickerText?.id}
          startEdit={startEdit}
        />
      </div>
    );
  }

  if (isManual) {
    const phaseLabel = PHASE_SHORT_LABEL[tickerText?.phase];
    const phaseIcon = PHASE_DEFAULT_ICON[tickerText?.phase] ?? icon ?? "•";
    // Dedup-Keys (z.B. "pass_h_90") sind kein Emoji → Fallback auf 📊
    const isCodeKey = tickerText?.icon && /^[a-z0-9_]+$/i.test(tickerText.icon);
    const displayIcon = isCodeKey ? "📊" : (tickerText?.icon ?? phaseIcon);
    const minuteDisplay =
      phaseLabel ??
      (tickerText?.minute != null ? `${tickerText.minute}'` : "–");
    return (
      <div className="lt-entry lt-entry--manual">
        <span className="lt-entry__minute">{minuteDisplay}</span>
        {tickerText?.phase !== "Before" && (
          <span className="lt-entry__icon">
            {getMediaIcon(
              tickerText?.video_url,
              tickerText?.image_url,
              displayIcon,
            )}
          </span>
        )}
        <div className="lt-entry__body">
          <MediaContent
            videoUrl={tickerText?.video_url}
            imageUrl={tickerText?.image_url}
          />
          {editing ? (
            <EditForm
              textareaRef={textareaRef}
              value={editText}
              onChange={setEditText}
              onSave={saveEdit}
              onCancel={cancelEdit}
              saving={saving}
            />
          ) : (
            <div className="lt-entry__text">{getDisplayText(tickerText)}</div>
          )}
          <div className="lt-entry__meta">
            {getMediaLabel(tickerText?.video_url, tickerText?.image_url)}
          </div>
        </div>
        <EntryMenu
          onEdit={onEdit}
          onDelete={onDelete}
          tickerTextId={tickerText?.id}
          startEdit={startEdit}
        />
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
          <EditForm
            textareaRef={textareaRef}
            value={editText}
            onChange={setEditText}
            onSave={saveEdit}
            onCancel={cancelEdit}
            saving={saving}
          />
        ) : (
          <div className="lt-entry__text">{tickerText.text}</div>
        )}
        <div className="lt-entry__meta">
          {tickerText.style} · {tickerText.llm_model}
        </div>
      </div>
      <EntryMenu
        onEdit={onEdit}
        onDelete={onDelete}
        tickerTextId={tickerText?.id}
        startEdit={startEdit}
      />
    </div>
  );
});

