import { POLL_EVENTS_MS, POLL_PREMATCH_MS } from "../constants";

/**
 * Gibt das Polling-Intervall in ms basierend auf dem Spielstatus zurück.
 *
 * Live + FullTime → 5 s (Events sofort sichtbar)
 * null (noch am Laden) → 5 s (konservativer Fallback)
 * Alle anderen Zustände (PreMatch, Cancelled …) → 15 s
 *
 * @param {string|null} matchState
 * @returns {number}
 */
export function resolvePollingInterval(
  matchState: string | null | undefined,
): number {
  if (matchState === "Live") return POLL_EVENTS_MS;
  if (matchState === "FullTime") return POLL_EVENTS_MS;
  if (matchState == null) return POLL_EVENTS_MS;
  return POLL_PREMATCH_MS;
}
