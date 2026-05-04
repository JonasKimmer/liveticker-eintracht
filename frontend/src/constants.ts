/**
 * Domain-Konstanten — werden von globalen Hooks und Utilities verwendet.
 * UI-only Konstanten (Labels, Icons, CSS) bleiben in LiveTicker/constants.ts.
 */

// ── Ticker-Modi ──────────────────────────────────────────────
export const MODES = {
  AUTO: "auto" as const,
  COOP: "coop" as const,
  MANUAL: "manual" as const,
};

// ── Match-Phasen (alle API-Werte) ────────────────────────────
export const MATCH_PHASES = {
  BEFORE: "Before",
  FIRST_HALF: "FirstHalf",
  FIRST_HALF_BREAK: "FirstHalfBreak",
  SECOND_HALF: "SecondHalf",
  SECOND_HALF_BREAK: "SecondHalfBreak",
  HALFTIME: "Halftime",
  AFTER: "After",
  EXTRA_FIRST_HALF: "ExtraFirstHalf",
  EXTRA_BREAK: "ExtraBreak",
  EXTRA_SECOND_HALF: "ExtraSecondHalf",
  EXTRA_SECOND_HALF_BREAK: "ExtraSecondHalfBreak",
  PENALTY_SHOOTOUT: "PenaltyShootout",
  FULL_TIME: "FullTime",
};

// ── Match-Status-Gruppen ─────────────────────────────────────
export const LIVE_STATUSES = ["1H", "2H", "HT", "ET", "live"];
export const FINISHED_STATUSES = ["FT", "AET", "PEN", "finished", "FullTime"];

// ── Polling-Intervalle (ms) ──────────────────────────────────
export const POLL_EVENTS_MS = 15000;
export const POLL_MATCH_REFRESH_MS = 30000;
export const POLL_PREMATCH_MS = 20000;
