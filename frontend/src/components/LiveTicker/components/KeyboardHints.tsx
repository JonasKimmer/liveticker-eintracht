// ============================================================
// KeyboardHints.jsx  — Modal (?-Taste)
// ============================================================
import { memo, Fragment } from "react";
import { MODES } from "../constants";

export const KeyboardHints: any = memo<any>(function KeyboardHints({ mode, onClose }: any) {
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

function KbGroup({ title, children }: any) {
  return (
    <div>
      <div className="lt-kb-group__title">{title}</div>
      <div className="lt-kb-group__list">{children}</div>
    </div>
  );
}

function KbItem({ keys, action, accent }: any) {
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

