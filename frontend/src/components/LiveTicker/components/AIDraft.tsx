// ============================================================
// AIDraft.jsx  — read-only Anzeige des AI-generierten Texts
// (CO-OP: TAB = annehmen, ESC = ablehnen, "Bearbeiten" öffnet EntryEditor)
// ============================================================
import { memo } from "react";
import { StylePickerDropdown } from "./StylePickerDropdown";

export const AIDraft: any = memo<any>(function AIDraft({
  eventType,
  draftText,
  onAccept,
  onReject,
  onEdit,
  onTextClick,
  onGenerate,
  generatingId,
  eventId,
}: any) {
  const isGenerating = generatingId === eventId;
  return (
    <div className="lt-draft">
      <div className="lt-draft__header">
        <span style={{ fontSize: "0.9rem" }}>✦</span>
        <span className="lt-draft__label">AI Draft — {eventType}</span>
      </div>

      <div
        className="lt-draft__text-wrap"
        onClick={onTextClick}
        style={onTextClick ? { cursor: "text" } : undefined}
        title={onTextClick ? "Klicken zum Bearbeiten" : undefined}
      >
        <p className="lt-draft__text">{draftText || "Generiere Text…"}</p>
      </div>

      <div className="lt-draft__actions">
        <button className="lt-btn lt-btn--primary" onClick={onAccept}>
          Annehmen <kbd className="lt-btn__kbd">TAB</kbd>
        </button>
        <button className="lt-btn lt-btn--ghost" onClick={onReject}>
          Ablehnen <kbd className="lt-btn__kbd">ESC</kbd>
        </button>
        {onEdit && (
          <button className="lt-btn lt-btn--ghost" onClick={onEdit}>
            ✎ Bearbeiten
          </button>
        )}
        {onGenerate && eventId && (
          <StylePickerDropdown
            onSelect={(s) => onGenerate(eventId, s)}
            disabled={isGenerating}
          />
        )}
      </div>
    </div>
  );
});

