// ============================================================
// ModeSelector.jsx
// ============================================================
import React from "react";
import { MODES, MODE_META } from "../constants";

export function ModeSelector({ mode, onModeChange }) {
  return (
    <div className="lt-mode-bar">
      <span className="lt-mode-bar__label">Modus</span>
      <div className="lt-mode-bar__group">
        {Object.values(MODES).map((m) => (
          <button
            key={m}
            className={`lt-mode-bar__btn${mode === m ? " lt-mode-bar__btn--active" : ""}`}
            onClick={() => onModeChange(m)}
            title={MODE_META[m].description}
          >
            {MODE_META[m].label}
          </button>
        ))}
      </div>
    </div>
  );
}
