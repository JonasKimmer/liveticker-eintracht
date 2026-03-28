// ============================================================
// MinuteEditor — Shared live-minute selector
// Used by: EntryEditor, PublishModal (MediaPickerPanel)
// Pairs with: useLiveMinuteEditor hook
// ============================================================
import { useRef } from "react";
import { MAX_MATCH_MINUTE } from "../constants";

export function MinuteEditor({
  minute,
  setMinute,
  minuteEditing,
  setMinuteEditing,
  minuteOverride,
  setMinuteOverride,
  currentMinute,
}: any) {
  const inputRef = useRef(null);

  return (
    <div className="lt-editor__minute">
      {minuteEditing ? (
        <input
          ref={inputRef}
          type="number"
          className="lt-editor__minute-input"
          value={minute}
          min={0}
          max={MAX_MATCH_MINUTE}
          onChange={(e) => {
            setMinute(Number(e.target.value));
            setMinuteOverride(true);
          }}
          onBlur={() => setMinuteEditing(false)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") setMinuteEditing(false); }}
          autoFocus
        />
      ) : (
        <button
          type="button"
          className={`lt-editor__minute-btn${minuteOverride ? " lt-editor__minute-btn--manual" : ""}`}
          onClick={() => setMinuteEditing(true)}
          title={minuteOverride ? "Manuell gesetzt – klicken zum Ändern" : "Live-Minute – klicken zum Überschreiben"}
        >
          {minute > 0 ? `${minute}'` : "–'"}
          {!minuteOverride && <span className="lt-editor__minute-live" />}
        </button>
      )}
      {minuteOverride && (
        <button
          type="button"
          className="lt-editor__minute-reset"
          onClick={() => { setMinuteOverride(false); setMinute(currentMinute); }}
          title="Auf Live-Minute zurücksetzen"
        >↺</button>
      )}
    </div>
  );
}

