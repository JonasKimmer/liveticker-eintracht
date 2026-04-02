// ============================================================
// PublishedEntry.jsx  (React.memo — rendert oft)
// ============================================================
import React, { memo, useState, useCallback, useRef } from "react";
import { getEventMeta } from "../../utils/parseCommand";
import {
  PHASE_SHORT_LABEL,
  PHASE_DEFAULT_ICON,
} from "../../constants";
import type { MatchEvent, TickerEntry } from "../../../../types";
import { getMediaIcon, getMediaLabel, getDisplayText } from "./entryUtils";
import { MediaContent } from "./MediaContent";
import { EntryMenu } from "./EntryMenu";
import { EditForm } from "./EditForm";

interface PublishedEntryProps {
  tickerText: TickerEntry | null;
  entry?: MatchEvent | null;
  isManual?: boolean;
  isPrematch?: boolean;
  onEdit?: (id: number, text: string) => Promise<void>;
  onDelete?: (id: number) => Promise<void>;
}

export const PublishedEntry = memo(function PublishedEntry({
  entry,
  tickerText,
  isManual,
  isPrematch,
  onEdit,
  onDelete,
}: PublishedEntryProps) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
