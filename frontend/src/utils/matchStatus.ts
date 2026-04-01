import { LIVE_STATUSES, FINISHED_STATUSES } from "../constants";

/**
 * Normalisiert einen Match-Status-String auf drei kanonische Werte.
 */
export function normalizeMatchStatus(
  status: string | null | undefined,
): "live" | "finished" | "scheduled" {
  if (status && LIVE_STATUSES.includes(status)) return "live";
  if (status && FINISHED_STATUSES.includes(status)) return "finished";
  return "scheduled";
}
