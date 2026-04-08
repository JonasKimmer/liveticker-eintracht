// ============================================================
// PublishedEntry.jsx  (React.memo — rendert oft)
// ============================================================
import React, { memo, useState, useCallback, useRef, useEffect } from "react";
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
  onEdit?: (id: number, text: string, minute?: number | null) => Promise<void>;
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
  const [minuteEditing, setMinuteEditing] = useState(false);
  const [editMinute, setEditMinute] = useState<number>(tickerText?.minute ?? 0);
  const minuteInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (minuteEditing) minuteInputRef.current?.select();
  }, [minuteEditing]);

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

  const saveMinute = useCallback(async () => {
    if (!onEdit || !tickerText?.id) return;
    setMinuteEditing(false);
    await onEdit(tickerText.id, tickerText.text ?? "", editMinute);
  }, [onEdit, tickerText?.id, tickerText?.text, editMinute]);

  const eventType =
    entry?.liveTickerEventType ?? entry?.event_type ?? entry?.type;
  const { icon, cssClass } = getEventMeta(eventType, entry?.detail);

  const minuteInputEl = (
    <input
      ref={minuteInputRef}
      type="number"
      min={0}
      max={150}
      value={editMinute}
      onChange={(e) => setEditMinute(Number(e.target.value))}
      onBlur={saveMinute}
      onKeyDown={(e) => {
        if (e.key === "Enter") saveMinute();
        if (e.key === "Escape") setMinuteEditing(false);
      }}
      className="lt-entry__minute"
      style={{ width: 40, textAlign: "center", background: "var(--lt-bg-input)", border: "1px solid var(--lt-accent)", borderRadius: 4, color: "var(--lt-accent)", fontFamily: "var(--lt-font-mono)", fontSize: "0.72rem", padding: "1px 2px" }}
    />
  );

  if (isPrematch) {
    const prematchDisplay = tickerText?.minute != null ? `${tickerText.minute}'` : "Vor";
    return (
      <div className="lt-entry lt-entry--pre">
        {onEdit && minuteEditing ? minuteInputEl : (
          <span
            className="lt-entry__minute lt-entry__minute--pre"
            onClick={onEdit ? () => { setEditMinute(tickerText?.minute ?? 0); setMinuteEditing(true); } : undefined}
            title={onEdit ? "Minute bearbeiten" : undefined}
            style={onEdit ? { cursor: "text" } : undefined}
          >
            {prematchDisplay}
          </span>
        )}
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
    const phase = tickerText?.phase;
    const hasPhaseLabel = phase != null && phase in PHASE_SHORT_LABEL;
    const phaseLabel = hasPhaseLabel ? PHASE_SHORT_LABEL[phase] : undefined;
    const phaseIcon = PHASE_DEFAULT_ICON[tickerText?.phase] ?? icon ?? null;
    // Dedup-Keys (z.B. "pass_h_90") sind kein Emoji → Fallback auf 📊
    const isCodeKey = tickerText?.icon && /^[a-z0-9_]+$/i.test(tickerText.icon);
    const displayIcon = isCodeKey ? "📊" : (tickerText?.icon ?? phaseIcon);
    // null-Label: minute vorhanden → echte Minute zeigen, sonst leer
    // string-Label: immer das Label zeigen
    // kein Label in PHASE_SHORT_LABEL → echte Minute oder "–"
    const minuteDisplay = hasPhaseLabel
      ? (phaseLabel !== null ? phaseLabel : (tickerText?.minute != null ? `${tickerText.minute}'` : ""))
      : (tickerText?.minute != null ? `${tickerText.minute}'` : "–");
    return (
      <div className="lt-entry lt-entry--manual">
        {onEdit && minuteEditing ? minuteInputEl : (
          <span
            className="lt-entry__minute"
            onClick={onEdit ? () => { setEditMinute(tickerText?.minute ?? 0); setMinuteEditing(true); } : undefined}
            title={onEdit ? "Minute bearbeiten" : undefined}
            style={onEdit ? { cursor: "text" } : undefined}
          >
            {minuteDisplay}
          </span>
        )}
        {tickerText?.phase !== "Before" && displayIcon && (
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

  const eventMinute = tickerText.minute ?? entry.time ?? entry.minute;
  return (
    <div className={`lt-entry${cssClass ? ` lt-entry--${cssClass}` : ""}`}>
      {onEdit && minuteEditing ? minuteInputEl : (
        <span
          className="lt-entry__minute"
          onClick={onEdit ? () => { setEditMinute(eventMinute ?? 0); setMinuteEditing(true); } : undefined}
          title={onEdit ? "Minute bearbeiten" : undefined}
          style={onEdit ? { cursor: "text" } : undefined}
        >
          {eventMinute != null ? `${eventMinute}'` : "–"}
        </span>
      )}
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
