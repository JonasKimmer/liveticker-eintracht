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
import { useState, useEffect, useRef } from "react";
import { SYNC_MATCH_INTERVAL_MS } from "../constants";

/**
 * @param currentMinute - Live minute from the parent (e.g. match.minute)
 */
export function useLiveMinuteEditor(currentMinute: number | null) {
  const [minute, setMinute] = useState(currentMinute ?? 0);
  const [minuteEditing, setMinuteEditing] = useState(false);
  const [minuteOverride, setMinuteOverride] = useState(false);
  const minuteRef = useRef(minute);

  useEffect(() => {
    minuteRef.current = minute;
  }, [minute]);

  // Sync from prop when not manually overridden
  useEffect(() => {
    if (!minuteOverride) setMinute(currentMinute ?? 0);
  }, [currentMinute, minuteOverride]);

  // Tick up every 60 s when match is running and minute not locked.
  // minuteRef avoids adding `minute` to deps which would restart the interval every tick.
  useEffect(() => {
    if (minuteOverride) return;
    const id = setInterval(() => {
      if (minuteRef.current) setMinute((m) => m + 1);
    }, SYNC_MATCH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [minuteOverride]);

  return {
    minute,
    setMinute,
    minuteEditing,
    setMinuteEditing,
    minuteOverride,
    setMinuteOverride,
  };
}
