/**
 * Zentrale Konstanten für den LiveTicker.
 * Keine Magic Strings in Komponenten — immer diese Werte verwenden.
 */

// ── Ticker-Modi ──────────────────────────────────────────────
export const MODES = {
  AUTO: "auto" as const,
  COOP: "coop" as const,
  MANUAL: "manual" as const,
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
export const TICKER_STYLES = ["neutral", "euphorisch", "kritisch"] as const;

// ── Nav-Tabs ─────────────────────────────────────────────────
export const NAV_TABS = [
  { id: "teams", label: "🏆 Teams" },
];

// ── Match-Status ─────────────────────────────────────────────
export const LIVE_STATUSES = ["1H", "2H", "HT", "ET", "live"];
export const FINISHED_STATUSES = ["FT", "AET", "PEN", "finished"];

// ── Polling-Intervalle (ms) ──────────────────────────────────
export const POLL_EVENTS_MS = 5000;
export const POLL_MATCH_REFRESH_MS = 15000;  // zweites Refresh-Intervall nach Kick-off
export const POLL_PREMATCH_MS = 5000;        // Pre-Match-Polling (Drafts schnell sichtbar, LLM ~15-30s)
export const SYNC_MATCH_INTERVAL_MS = 60000; // Live-Minuten-Tick (useLiveMinuteEditor)
export const TOAST_DURATION_MS = 2200;       // Toast-Anzeige (ModeSelector)
export const AUTO_ERROR_TIMEOUT_MS = 6000;   // Auto-Fehler-Anzeige (CenterPanel)

// ── Spielminuten ──────────────────────────────────────────────
export const MAX_MATCH_MINUTE = 120; // inkl. Verlängerung (MinuteEditor, ClipPicker, …)

// ── Publish-Phasen (Social-Media Panels) ─────────────────────
export const PUBLISH_PHASES = [
  { value: "",          label: "Spielminute" },
  { value: "Before",   label: "Pre Match"   },
  { value: "Halftime", label: "Halbzeit"    },
  { value: "After",    label: "After Match" },
];

// ── Phasen-Sortierung (für Frontend-Ticker-Reihenfolge) ──────
// Fester Minuten-Wert für Phasen-Events; null = sortiere nach t.minute
export const PHASE_SORT = {
  Before: -1, FirstHalf: null, FirstHalfBreak: 45.5, Halftime: 45.5,
  SecondHalf: null, SecondHalfBreak: 90.5,
  ExtraFirstHalf: null, ExtraBreak: 105.5,
  ExtraSecondHalf: null, ExtraSecondHalfBreak: 120.5,
  PenaltyShootout: null, After: 999,
};
// Fallback-Minuten wenn minute: null aber Phase bekannt
export const PHASE_MINUTE_DEFAULT = {
  FirstHalf: 1, SecondHalf: 46,
  ExtraFirstHalf: 91, ExtraSecondHalf: 106, PenaltyShootout: 121,
};
// Phasen, die einen Spielabschnitt starten (erscheinen zuerst in ihrer Minute)
export const PHASE_START = new Set([
  "FirstHalf", "SecondHalf", "ExtraFirstHalf", "ExtraSecondHalf", "PenaltyShootout",
]);

// ── Match-Phasen (alle API-Werte) ────────────────────────────
export const MATCH_PHASES = {
  BEFORE:                  "Before",
  FIRST_HALF:              "FirstHalf",
  FIRST_HALF_BREAK:        "FirstHalfBreak",
  SECOND_HALF:             "SecondHalf",
  SECOND_HALF_BREAK:       "SecondHalfBreak",
  HALFTIME:                "Halftime",
  AFTER:                   "After",
  EXTRA_FIRST_HALF:        "ExtraFirstHalf",
  EXTRA_BREAK:             "ExtraBreak",
  EXTRA_SECOND_HALF:       "ExtraSecondHalf",
  EXTRA_SECOND_HALF_BREAK: "ExtraSecondHalfBreak",
  PENALTY_SHOOTOUT:        "PenaltyShootout",
  FULL_TIME:               "FullTime",
};

// ── Phasen-Label (Deutsch) ────────────────────────────────────
// Einzige Quelle für Phase → lesbaren Namen-Mapping im Frontend.
export const PHASE_LABEL = {
  Before:            "Vorberichterstattung",
  PreMatch:          "Vorberichterstattung",
  FirstHalf:         "Anpfiff 1. HZ",
  FirstHalfBreak:    "Halbzeit",
  SecondHalf:        "Anpfiff 2. HZ",
  FullTime:          "Abpfiff",
  After:             "Abpfiff",
  ExtraFirstHalf:    "Verlängerung",
  ExtraBreak:        "VZ-Pause",
  ExtraSecondHalf:   "Verlängerung 2. HZ",
  PenaltyShootout:   "Elfmeterschießen",
};

// ── Vorberichts-Phasen ────────────────────────────────────────
export const PREMATCH_PHASES = new Set(["Before", "PreMatch"]);

// ── Kurzbezeichnungen für Phasen (Minuten-Spalte im Ticker) ──
// Kurze Anzeige-Labels z.B. "HZ", "FT" — getrennt von PHASE_LABEL (vollständige Namen).
export const PHASE_SHORT_LABEL = {
  Before:               "i",
  After:                "i",
  FullTime:             "FT",
  Halftime:             "HZ",
  FirstHalfBreak:       "HZ",
  SecondHalf:           "Anstoß",
  SecondHalfBreak:      "Pause",
  ExtraBreak:           "VZ·P",
  ExtraSecondHalfBreak: "Elfm.P",
  ExtraFirstHalf:       "VZ1",
  ExtraSecondHalf:      "VZ2",
  PenaltyShootout:      "Elfm.",
};

// ── Standard-Icons für Phasen-Events (Manual-Einträge) ───────
export const PHASE_DEFAULT_ICON = {
  FirstHalf:        "📣",
  SecondHalf:       "📣",
  ExtraFirstHalf:   "📣",
  ExtraSecondHalf:  "📣",
  FirstHalfBreak:   "📣",
  SecondHalfBreak:  "📣",
  ExtraBreak:       "📣",
  After:            "📣",
  FullTime:         "📣",
  PenaltyShootout:  "🥅",
};

// ── Command-Prefix-Regex ──────────────────────────────────────
// Matcht /command + whitespace am Anfang (z.B. "/g " oder "/gelb ").
export const COMMAND_PREFIX_REGEX = /^\/\w+\s*/;

// ── Standard-Icons für Medien-Einträge ────────────────────────
export const MEDIA_DEFAULT_ICONS = ["🎬", "📷", "📸"];

// ── URL-Pattern-Erkennung (Social Media) ─────────────────────
// Werden in PublishedEntry + anderen Komponenten genutzt.
export const URL_PATTERNS = {
  twitter:   /x\.com|twitter\.com/,
  instagram: /instagram\.com/,
  youtube:   /youtube\.com|youtu\.be/,
};

// ── KI-Schreibstil-Metadaten ──────────────────────────────────
// Wird in AIDraft, SummaryDraftCard und StylePickerDropdown genutzt.
export const STYLE_META = {
  neutral:    { emoji: "⚪", label: "Neutral" },
  euphorisch: { emoji: "🔥", label: "Euphorisch" },
  kritisch:   { emoji: "⚡", label: "Kritisch" },
};

// ── Social Media Brand-Stile ──────────────────────────────────
export const INSTA_GRADIENT = "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)";
