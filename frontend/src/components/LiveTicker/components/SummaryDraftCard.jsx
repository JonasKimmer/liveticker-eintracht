import { useState } from "react";
import PropTypes from "prop-types";
import { TICKER_STYLES } from "../constants";

export function SummaryDraftCard({
  draft,
  label = "KI-Text",
  onPublish,
  onReject,
  onGenerate,
  generatingId,
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(draft.text ?? "");
  return (
    <div className="lt-draft" style={{ marginBottom: "0.5rem" }}>
      <div className="lt-draft__header">
        <span style={{ fontSize: "0.9rem" }}>{draft.icon ?? "✦"}</span>
        <span className="lt-draft__label">{label}</span>
      </div>
      <div className="lt-draft__text-wrap">
        {editing ? (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            className="lt-entry__edit-textarea"
            autoFocus
            style={{ width: "100%", marginBottom: "0.5rem" }}
          />
        ) : (
          <p
            className="lt-draft__text"
            style={{ cursor: "text" }}
            onClick={() => setEditing(true)}
            title="Klicken zum Bearbeiten"
          >
            {text || "Generiere Text…"}
          </p>
        )}
      </div>
      <div className="lt-draft__actions">
        <button
          className="lt-btn lt-btn--primary"
          onClick={() => onPublish(text)}
        >
          Annehmen <kbd className="lt-btn__kbd">TAB</kbd>
        </button>
        <button className="lt-btn lt-btn--ghost" onClick={onReject}>
          Ablehnen <kbd className="lt-btn__kbd">ESC</kbd>
        </button>
        <button
          className="lt-btn lt-btn--ghost"
          onClick={() => setEditing((v) => !v)}
        >
          {editing ? "✓ Fertig" : "✎ Bearbeiten"}
        </button>
        {onGenerate && (
          <>
            {TICKER_STYLES.map((s) => (
              <button
                key={s}
                className="lt-event-card__gen-btn"
                onClick={() => onGenerate(draft.id, s)}
                disabled={generatingId === draft.id}
                style={{ fontSize: "0.75rem", padding: "0.4rem 0.6rem" }}
                title={`Neu als ${s} generieren`}
              >
                {generatingId === draft.id ? "…" : `${s}`}
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

SummaryDraftCard.propTypes = {
  draft: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    text: PropTypes.string,
    icon: PropTypes.string,
  }).isRequired,
  label: PropTypes.string,
  onPublish: PropTypes.func.isRequired,
  onReject: PropTypes.func.isRequired,
  onGenerate: PropTypes.func,
  generatingId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};
