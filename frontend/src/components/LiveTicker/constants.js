/**
 * Zentrale Konstanten für den LiveTicker.
 * Keine Magic Strings in Komponenten — immer diese Werte verwenden.
 */

// ── Ticker-Modi ──────────────────────────────────────────────
export const MODES = {
  AUTO: "auto",
  COOP: "coop",
  MANUAL: "manual",
};

export const MODE_META = {
  [MODES.AUTO]: {
    label: "AUTO",
    description: "AI generiert & veröffentlicht automatisch",
  },
  [MODES.COOP]: {
    label: "CO-OP",
    description: "AI-Draft anzeigen, du entscheidest",
  },
  [MODES.MANUAL]: { label: "MANUAL", description: "Volle manuelle Kontrolle" },
};

// ── Event-Typen ──────────────────────────────────────────────
export const EVENT_TYPES = {
  GOAL: "Goal",
  CARD: "Card",
  SUBST: "subst",
};

export const EVENT_META = {
  [EVENT_TYPES.GOAL]: { icon: "⚽", cssClass: "goal", label: "Tor" },
  [EVENT_TYPES.CARD]: { icon: "🟨", cssClass: "card", label: "Karte" },
  [EVENT_TYPES.SUBST]: { icon: "🔄", cssClass: "sub", label: "Wechsel" },
};

// ── Manual Icons ─────────────────────────────────────────────
export const MANUAL_ICONS = [
  { icon: "⚽", label: "Tor" },
  { icon: "🟨", label: "Gelb" },
  { icon: "🟥", label: "Rot" },
  { icon: "🔄", label: "Wechsel" },
  { icon: "📋", label: "Info" },
  { icon: "⚡", label: "Highlight" },
];

// ── Ticker-Styles (für API-Calls) ────────────────────────────
export const TICKER_STYLES = ["neutral", "euphorisch", "kritisch"];

// ── Nav-Tabs ─────────────────────────────────────────────────
export const NAV_TABS = [
  { id: "teams", label: "🏆 Teams" },
  { id: "heute", label: "📅 Heute" },
  { id: "live", label: "🔴 Live" },
  { id: "favoriten", label: "⭐ Favoriten" },
];

// ── Match-Status ─────────────────────────────────────────────
export const LIVE_STATUSES = ["1H", "2H", "HT", "ET", "live"];
export const FINISHED_STATUSES = ["FT", "AET", "PEN", "finished"];

// ── Polling-Intervalle (ms) ──────────────────────────────────
export const POLL_EVENTS_MS = 5000;
export const POLL_LIVE_MS = 10000;
