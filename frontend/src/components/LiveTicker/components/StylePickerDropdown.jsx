import PropTypes from "prop-types";
import { useState } from "react";
import { TICKER_STYLES, STYLE_META } from "../constants";

/**
 * Wiederverwendbarer KI-Stil-Picker (AIDraft + SummaryDraftCard).
 * Zeigt einen Toggle-Button; bei Klick öffnet sich ein Dropdown mit Stil-Optionen.
 */
export function StylePickerDropdown({ onSelect, disabled }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <button
        className="lt-btn lt-btn--ghost"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        style={{ fontSize: "0.75rem" }}
      >
        {disabled ? "…" : `✦ KI-Stil${open ? " ▲" : " ▼"}`}
      </button>
      {open && (
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
          <div
            style={{
              fontSize: "0.65rem",
              color: "var(--lt-text-muted)",
              padding: "0.2rem 0.5rem 0.35rem",
              marginBottom: "0.2rem",
              borderBottom: "1px solid var(--lt-border)",
            }}
          >
            KI-Schreibstil
          </div>
          {TICKER_STYLES.map((s) => {
            const meta = STYLE_META[s] ?? { emoji: "✦", label: s };
            return (
              <button
                key={s}
                onClick={() => { onSelect(s); setOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: "0.5rem",
                  width: "100%", background: "none", border: "none",
                  padding: "0.35rem 0.5rem", cursor: "pointer",
                  fontSize: "0.8rem", color: "var(--lt-text)",
                  borderRadius: 5, textAlign: "left",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
              >
                <span>{meta.emoji}</span>
                <span>{meta.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

StylePickerDropdown.propTypes = {
  onSelect: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};
