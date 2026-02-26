// ============================================================
// EntryEditor.jsx  — editierbares Textarea
// (CO-OP nach "Bearbeiten" + MANUAL immer sichtbar)
// ============================================================
import React, { useState, useMemo, useRef } from "react";
import { parseCommand } from "../utils/parseCommand";
import { MODES, MANUAL_ICONS } from "../constants";

export function EntryEditor({
  value,
  onChange,
  onPublish,
  onCancel,
  mode,
  currentMinute = 0,
}) {
  const [showCmds, setShowCmds] = useState(false);
  const [manualIcon, setManualIcon] = useState("📝");
  const [manualMinute, setManualMinute] = useState("");
  const [error, setError] = useState("");
  const textareaRef = useRef(null);

  // Live-Preview des Commands
  const preview = useMemo(() => {
    if (!value.trim().startsWith("/")) return null;
    return parseCommand(
      value,
      currentMinute || parseInt(manualMinute, 10) || 0,
    );
  }, [value, currentMinute, manualMinute]);

  const handleKeyDown = (e) => {
    // Enter → Command formatieren (nicht senden)
    if (
      e.key === "Enter" &&
      !e.ctrlKey &&
      !e.shiftKey &&
      value.trim().startsWith("/")
    ) {
      if (preview?.isValid) {
        e.preventDefault();
        onChange(preview.formatted);
      }
      return;
    }
    // Ctrl+Enter → veröffentlichen
    if (e.ctrlKey && e.key === "Enter") {
      e.preventDefault();
      handlePublish();
    }
  };

  const handlePublish = () => {
    setError("");
    if (mode === MODES.MANUAL) {
      const min = parseInt(manualMinute, 10);
      if (!manualMinute || isNaN(min) || min < 1 || min > 120) {
        setError("Bitte eine gültige Minute eingeben (1–120)");
        return;
      }
    }
    if (value.trim().startsWith("/") && preview?.isValid) {
      onChange(preview.formatted);
      setTimeout(
        () =>
          onPublish?.({ icon: manualIcon, minute: parseInt(manualMinute, 10) }),
        0,
      );
      return;
    }
    onPublish?.({ icon: manualIcon, minute: parseInt(manualMinute, 10) });
  };

  return (
    <div className="lt-editor">
      <div className="lt-editor__toolbar">
        <span className="lt-editor__label">
          {mode === MODES.MANUAL ? "Manueller Eintrag" : "Entwurf bearbeiten"}
        </span>
        <button
          className="lt-editor__toggle-cmds"
          onClick={() => setShowCmds((s) => !s)}
        >
          {showCmds ? "Commands ausblenden" : "Commands anzeigen"}
        </button>
      </div>

      {showCmds && (
        <div className="lt-editor__cmd-guide">
          <div className="lt-editor__cmd-title">⚡ Slash Commands</div>
          <div className="lt-editor__cmd-grid">
            {[
              [
                "/goal Müller FCB",
                `${currentMinute || "??"}'  ⚽ TOR — Müller (FCB)`,
              ],
              [
                "/card Müller FCB yellow",
                `${currentMinute || "??"}'  🟨 KARTE — Müller (FCB)`,
              ],
              [
                "/sub Kimmich Coman FCB",
                `${currentMinute || "??"}'  🔄 WECHSEL — Kimmich ↔ Coman (FCB)`,
              ],
              [
                "/note Ecke für FCB",
                `${currentMinute || "??"}'  — Ecke für FCB`,
              ],
            ].map(([cmd, result]) => (
              <div key={cmd} className="lt-editor__cmd-item">
                <code>{cmd}</code>
                <p>→ {result}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Icon + Minute (nur MANUAL) */}
      {mode === MODES.MANUAL && (
        <div className="lt-editor__icon-row">
          {MANUAL_ICONS.map(({ icon, label }) => (
            <button
              key={icon}
              className={`lt-editor__icon-btn${manualIcon === icon ? " lt-editor__icon-btn--active" : ""}`}
              title={label}
              onClick={() => setManualIcon(icon)}
            >
              {icon}
            </button>
          ))}
          <input
            className="lt-editor__minute-input"
            type="number"
            min={1}
            max={120}
            placeholder="Min."
            value={manualMinute}
            onChange={(e) => {
              setManualMinute(e.target.value);
              setError("");
            }}
          />
        </div>
      )}

      {error && <div className="lt-editor__error">{error}</div>}

      <div className="lt-editor__input-wrap">
        <textarea
          ref={textareaRef}
          className="lt-editor__textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="/goal Müller FCB  ·  /card Müller FCB yellow  ·  /sub Kimmich Coman FCB"
          rows={3}
        />
        {!value.trim().startsWith("/") && (
          <div className="lt-editor__hint">
            Tippe <span>/</span> für Commands · <kbd>Ctrl+Enter</kbd> zum
            Veröffentlichen
          </div>
        )}
      </div>

      {/* Live Preview */}
      {preview && (
        <div
          className={`lt-editor__preview${preview.isValid ? " lt-editor__preview--valid" : ""}`}
        >
          <div className="lt-editor__preview-label">
            {preview.isValid ? "✓ Vorschau" : "⚠ Vorschau (unvollständig)"}
          </div>
          <div
            className={`lt-editor__preview-text${preview.isValid ? " lt-editor__preview-text--valid" : ""}`}
          >
            {preview.formatted}
          </div>
          {preview.warnings.map((w, i) => (
            <div key={i} className="lt-editor__preview-warning">
              ⚠ {w}
            </div>
          ))}
        </div>
      )}

      <div className="lt-editor__actions">
        {onCancel && (
          <button className="lt-btn lt-btn--ghost" onClick={onCancel}>
            Abbrechen
          </button>
        )}
        <button
          className="lt-btn lt-btn--primary"
          onClick={handlePublish}
          disabled={!value.trim()}
        >
          Veröffentlichen <kbd className="lt-btn__kbd">Ctrl+↵</kbd>
        </button>
      </div>
    </div>
  );
}
