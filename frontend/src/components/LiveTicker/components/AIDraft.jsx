// ============================================================
// AIDraft.jsx  — read-only Anzeige des AI-generierten Texts
// (CO-OP: TAB = annehmen, ESC = ablehnen, "Bearbeiten" öffnet EntryEditor)
// ============================================================
import React from "react";

export function AIDraft({
  eventType,
  confidence,
  draftText,
  onAccept,
  onReject,
  onEdit,
}) {
  return (
    <div className="lt-draft">
      <div className="lt-draft__header">
        <span style={{ fontSize: "0.9rem" }}>✦</span>
        <span className="lt-draft__label">AI Draft — {eventType}</span>
        {confidence && (
          <span
            className={`lt-draft__confidence lt-draft__confidence--${confidence}`}
          >
            {confidence}
          </span>
        )}
      </div>

      <div className="lt-draft__text-wrap">
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
      </div>
    </div>
  );
}
