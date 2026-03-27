// ============================================================
// AIDraft.jsx  — read-only Anzeige des AI-generierten Texts
// (CO-OP: TAB = annehmen, ESC = ablehnen, "Bearbeiten" öffnet EntryEditor)
// ============================================================
import { memo } from "react";
import PropTypes from "prop-types";
import { TICKER_STYLES } from "../constants";

export const AIDraft = memo(function AIDraft({
  eventType,
  draftText,
  onAccept,
  onReject,
  onEdit,
  onTextClick,
  onGenerate,
  generatingId,
  eventId,
}) {
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
        {onGenerate &&
          eventId &&
          TICKER_STYLES.map((s) => (
            <button
              key={s}
              className="lt-event-card__gen-btn"
              onClick={() => onGenerate(eventId, s)}
              disabled={generatingId === eventId}
              style={{ fontSize: "0.75rem", padding: "0.4rem 0.6rem" }}
              title={`Neu als ${s} generieren`}
            >
              {generatingId === eventId ? "…" : `${s}`}
            </button>
          ))}
      </div>
    </div>
  );
});

AIDraft.propTypes = {
  eventType: PropTypes.string.isRequired,
  draftText: PropTypes.string,
  onAccept: PropTypes.func,
  onReject: PropTypes.func,
  onEdit: PropTypes.func,
  onTextClick: PropTypes.func,
  onGenerate: PropTypes.func,
  generatingId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  eventId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};
