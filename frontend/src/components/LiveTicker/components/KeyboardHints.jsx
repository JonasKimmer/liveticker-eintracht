// ============================================================
// KeyboardHints.jsx  — Modal (?-Taste)
// ============================================================
import { memo, Fragment } from "react";
import PropTypes from "prop-types";
import { MODES } from "../constants";

export const KeyboardHints = memo(function KeyboardHints({ mode, onClose }) {
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
            <KbItem keys={["Ctrl", "1"]} action="AUTO Modus" />
            <KbItem keys={["Ctrl", "2"]} action="CO-OP Modus" />
            <KbItem keys={["Ctrl", "3"]} action="MANUAL Modus" />
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
              <KbItem keys={["/g"]}       action="Tor" />
              <KbItem keys={["/og"]}      action="Eigentor" />
              <KbItem keys={["/gelb"]}    action="Gelbe Karte" />
              <KbItem keys={["/rot"]}     action="Rote Karte" />
              <KbItem keys={["/ep"]}      action="Elfmeter verschossen" />
              <KbItem keys={["/s"]}       action="Wechsel" />
              <KbItem keys={["/n"]}       action="Notiz" />
              <KbItem keys={["/anpfiff"]} action="Anpfiff" />
              <KbItem keys={["/hz"]}      action="Halbzeit" />
              <KbItem keys={["/2hz"]}     action="2. Halbzeit" />
              <KbItem keys={["/abpfiff"]} action="Abpfiff" />
            </KbGroup>
          )}

          {mode !== MODES.AUTO && (
            <KbGroup title="Editor">
              <KbItem keys={["↑", "↓"]}    action="In Vorschlägen navigieren" />
              <KbItem keys={["Tab"]}        action="Vorschlag übernehmen" />
              <KbItem keys={["Enter"]}      action="Command als Vorschau formatieren" />
              <KbItem keys={["Esc"]}        action="Palette schließen" />
            </KbGroup>
          )}
        </div>

        <div className="lt-kb-modal__footer">
          Drücke <kbd>?</kbd> um diese Hilfe zu schließen
        </div>
      </div>
    </div>
  );
});

KeyboardHints.propTypes = {
  mode: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};

function KbGroup({ title, children }) {
  return (
    <div>
      <div className="lt-kb-group__title">{title}</div>
      <div className="lt-kb-group__list">{children}</div>
    </div>
  );
}

KbGroup.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node,
};

function KbItem({ keys, action, accent }) {
  return (
    <div className="lt-kb-item">
      <div className="lt-kb-item__keys">
        {keys.map((k, i) => (
          <Fragment key={k}>
            <kbd
              className={`lt-kb-item__key${accent ? " lt-kb-item__key--accent" : ""}`}
            >
              {k}
            </kbd>
            {i < keys.length - 1 && <span className="lt-kb-item__sep">+</span>}
          </Fragment>
        ))}
      </div>
      <span className="lt-kb-item__action">{action}</span>
    </div>
  );
}

KbItem.propTypes = {
  keys: PropTypes.arrayOf(PropTypes.string).isRequired,
  action: PropTypes.string.isRequired,
  accent: PropTypes.bool,
};
