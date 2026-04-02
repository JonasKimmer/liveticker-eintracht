import { LIVE_STATUSES, FINISHED_STATUSES } from "../constants";

/**
 * Normalisiert einen Match-Status-String auf drei kanonische Werte.
 */
export function normalizeMatchStatus(
  status: string | null | undefined,
): "live" | "finished" | "scheduled" {
  if (!status) return "scheduled";
  const s = status.toLowerCase();
  if (LIVE_STATUSES.some((v) => v.toLowerCase() === s)) return "live";
  if (FINISHED_STATUSES.some((v) => v.toLowerCase() === s)) return "finished";
  return "scheduled";
}
