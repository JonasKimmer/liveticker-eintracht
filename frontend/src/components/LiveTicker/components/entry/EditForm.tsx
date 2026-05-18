// ============================================================
// EditForm.tsx — Inline edit textarea for ticker entries
// ============================================================
import React from "react";

export interface EditFormProps {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}

export function EditForm({
  textareaRef,
  value,
  onChange,
  onSave,
  onCancel,
  saving,
}: EditFormProps) {
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
