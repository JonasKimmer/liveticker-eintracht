// ============================================================
// ModeSelector.jsx
// ============================================================
import React, { useState } from "react";
import { MODES, MODE_META } from "../constants";

export function ModeSelector({ mode, onModeChange }) {
  const [pending, setPending] = useState(null);

  const handleClick = (m) => {
    if (m === mode) return;
    setPending(m);
  };

  const confirm = () => {
    onModeChange(pending);
    setPending(null);
  };

  const cancel = () => setPending(null);

  return (
    <>
      <div className="lt-mode-bar">
        <span className="lt-mode-bar__label">Modus</span>
        <div className="lt-mode-bar__group">
          {Object.values(MODES).map((m) => (
            <button
              key={m}
              className={`lt-mode-bar__btn${mode === m ? " lt-mode-bar__btn--active" : ""}`}
              onClick={() => handleClick(m)}
              title={MODE_META[m].description}
            >
              {MODE_META[m].label}
            </button>
          ))}
        </div>
      </div>

      {pending && (
        <div className="lt-mode-confirm-overlay" onClick={cancel}>
          <div className="lt-mode-confirm" onClick={(e) => e.stopPropagation()}>
            <p>
              Modus wechseln zu <strong>{MODE_META[pending].label}</strong>?
            </p>
            <p className="lt-mode-confirm__desc">{MODE_META[pending].description}</p>
            <div className="lt-mode-confirm__actions">
              <button className="lt-mode-confirm__btn lt-mode-confirm__btn--cancel" onClick={cancel}>
                Abbrechen
              </button>
              <button className="lt-mode-confirm__btn lt-mode-confirm__btn--confirm" onClick={confirm}>
                Bestätigen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
