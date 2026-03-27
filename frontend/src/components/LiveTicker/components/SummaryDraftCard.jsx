import { useState } from "react";
import PropTypes from "prop-types";
import { TICKER_STYLES } from "../constants";

const STYLE_META = {
  neutral:    { emoji: "⚪", label: "Neutral" },
  euphorisch: { emoji: "🔥", label: "Euphorisch" },
  kritisch:   { emoji: "⚡", label: "Kritisch" },
};

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
  const [showStylePicker, setShowStylePicker] = useState(false);
  const isGenerating = generatingId === "regenerating";
  return (
    <div className="lt-draft" style={{ marginBottom: "0.5rem", position: "relative" }}>
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
          <div style={{ position: "relative" }}>
            <button
              className="lt-btn lt-btn--ghost"
              onClick={() => setShowStylePicker((v) => !v)}
              disabled={isGenerating}
              style={{ fontSize: "0.75rem" }}
            >
              {isGenerating ? "…" : `✦ KI-Stil${showStylePicker ? " ▲" : " ▼"}`}
            </button>
            {showStylePicker && (
              <div
                style={{
                  position: "absolute",
                  bottom: "calc(100% + 6px)",
                  left: 0,
                  background: "var(--lt-bg)",
                  border: "1px solid var(--lt-border)",
                  borderRadius: 8,
                  padding: "0.3rem",
                  zIndex: 30,
                  minWidth: 150,
                  boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
                }}
              >
                <div style={{ fontSize: "0.65rem", color: "var(--lt-text-muted)", padding: "0.2rem 0.5rem 0.35rem", marginBottom: "0.2rem", borderBottom: "1px solid var(--lt-border)" }}>
                  KI-Schreibstil
                </div>
                {TICKER_STYLES.map((s) => {
                  const meta = STYLE_META[s] ?? { emoji: "✦", label: s };
                  return (
                    <button
                      key={s}
                      onClick={() => { onGenerate(draft.id, s); setShowStylePicker(false); }}
                      style={{
                        display: "flex", alignItems: "center", gap: "0.5rem",
                        width: "100%", background: "none", border: "none",
                        padding: "0.35rem 0.5rem", cursor: "pointer",
                        fontSize: "0.8rem", color: "var(--lt-text)",
                        borderRadius: 5, textAlign: "left",
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.07)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                    >
                      <span>{meta.emoji}</span>
                      <span>{meta.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
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
