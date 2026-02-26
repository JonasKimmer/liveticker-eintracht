// ============================================================
// KeyboardHints.jsx  — Modal (?-Taste)
// ============================================================
import React from "react";
import { MODES } from "../constants";

export function KeyboardHints({ mode, onClose }) {
  return (
    <div className="lt-kb-overlay" onClick={onClose}>
      <div className="lt-kb-modal" onClick={(e) => e.stopPropagation()}>
        <div className="lt-kb-modal__header">
          <h2 className="lt-kb-modal__title">Keyboard Shortcuts</h2>
          <button className="lt-kb-modal__close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="lt-kb-modal__grid">
          <KbGroup title="Modus wechseln">
            <KbItem keys={["Alt", "1"]} action="AUTO Modus" />
            <KbItem keys={["Alt", "2"]} action="CO-OP Modus" />
            <KbItem keys={["Alt", "3"]} action="MANUAL Modus" />
          </KbGroup>

          <KbGroup title="Veröffentlichen">
            <KbItem
              keys={["Ctrl", "Enter"]}
              action="Eintrag veröffentlichen"
              accent
            />
          </KbGroup>

          {mode === MODES.COOP && (
            <KbGroup title="AI Draft (CO-OP)">
              <KbItem keys={["TAB"]} action="Draft annehmen" />
              <KbItem keys={["ESC"]} action="Draft ablehnen" />
            </KbGroup>
          )}

          {mode !== MODES.AUTO && (
            <KbGroup title="Slash Commands">
              <KbItem keys={["/goal"]} action="Tor-Template" />
              <KbItem keys={["/card"]} action="Karten-Template" />
              <KbItem keys={["/sub"]} action="Wechsel-Template" />
              <KbItem keys={["/note"]} action="Notiz-Template" />
            </KbGroup>
          )}
        </div>

        <div className="lt-kb-modal__footer">
          Drücke <kbd>?</kbd> um diese Hilfe zu schließen
        </div>
      </div>
    </div>
  );
}

function KbGroup({ title, children }) {
  return (
    <div>
      <div className="lt-kb-group__title">{title}</div>
      <div className="lt-kb-group__list">{children}</div>
    </div>
  );
}

function KbItem({ keys, action, accent }) {
  return (
    <div className="lt-kb-item">
      <div className="lt-kb-item__keys">
        {keys.map((k, i) => (
          <React.Fragment key={k}>
            <kbd
              className={`lt-kb-item__key${accent ? " lt-kb-item__key--accent" : ""}`}
            >
              {k}
            </kbd>
            {i < keys.length - 1 && <span className="lt-kb-item__sep">+</span>}
          </React.Fragment>
        ))}
      </div>
      <span className="lt-kb-item__action">{action}</span>
    </div>
  );
}
