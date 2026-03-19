/**
 * useLiveMinuteEditor
 * ===================
 * Tracks the current match minute for a publish form.
 * - Syncs from the `currentMinute` prop whenever not manually overridden
 * - Auto-ticks every 60 s when the match is running (minute > 0)
 * - Exposes editing state so the UI can show an inline minute input
 *
 * Used by: EntryEditor, MediaPickerPanel (PublishModal)
 */
import { useState, useEffect } from "react";

/**
 * @param {number|null} currentMinute - Live minute from the parent (e.g. match.minute)
 * @returns {{
 *   minute: number, setMinute: Function,
 *   minuteEditing: boolean, setMinuteEditing: Function,
 *   minuteOverride: boolean, setMinuteOverride: Function,
 * }}
 */
export function useLiveMinuteEditor(currentMinute) {
  const [minute, setMinute]               = useState(currentMinute ?? 0);
  const [minuteEditing, setMinuteEditing] = useState(false);
  const [minuteOverride, setMinuteOverride] = useState(false);

  // Sync from prop when not manually overridden
  useEffect(() => {
    if (!minuteOverride) setMinute(currentMinute ?? 0);
  }, [currentMinute, minuteOverride]);

  // Tick up every 60 s when match is running and minute not locked
  useEffect(() => {
    if (minuteOverride || !minute) return;
    const id = setInterval(() => setMinute((m) => m + 1), 60000);
    return () => clearInterval(id);
  }, [minuteOverride, minute]);

  return { minute, setMinute, minuteEditing, setMinuteEditing, minuteOverride, setMinuteOverride };
}
