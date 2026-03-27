// ============================================================
// AIDraft.jsx  — read-only Anzeige des AI-generierten Texts
// (CO-OP: TAB = annehmen, ESC = ablehnen, "Bearbeiten" öffnet EntryEditor)
// ============================================================
import { useState, memo } from "react";
import PropTypes from "prop-types";
import { TICKER_STYLES } from "../constants";

const STYLE_META = {
  neutral:    { emoji: "⚪", label: "Neutral" },
  euphorisch: { emoji: "🔥", label: "Euphorisch" },
  kritisch:   { emoji: "⚡", label: "Kritisch" },
};

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
  const [showStylePicker, setShowStylePicker] = useState(false);
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
                      onClick={() => { onGenerate(eventId, s); setShowStylePicker(false); }}
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
