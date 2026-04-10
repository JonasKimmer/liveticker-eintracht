/**
 * Zentrale Konstanten für den LiveTicker.
 * Keine Magic Strings in Komponenten — immer diese Werte verwenden.
 *
 * Domain-Konstanten (Polling, Phasen, Modi) kommen aus src/constants.ts
 * und werden hier re-exportiert, damit LiveTicker-interne Imports unverändert bleiben.
 */

export {
  MODES,
  MATCH_PHASES,
  LIVE_STATUSES,
  FINISHED_STATUSES,
  POLL_EVENTS_MS,
  POLL_MATCH_REFRESH_MS,
  POLL_PREMATCH_MS,
} from "../../constants";

// ── Ticker-Styles (für API-Calls) ────────────────────────────
export const TICKER_STYLES = ["neutral", "euphorisch", "kritisch"] as const;

// ── Nav-Tabs ─────────────────────────────────────────────────
export const NAV_TABS = [{ id: "teams", label: "🏆 Teams" }];

// ── Spielminuten ──────────────────────────────────────────────
export const SYNC_MATCH_INTERVAL_MS = 60000; // Live-Minuten-Tick (useLiveMinuteEditor)
export const TOAST_DURATION_MS = 2200; // Toast-Anzeige (ModeSelector)
export const AUTO_ERROR_TIMEOUT_MS = 6000; // Auto-Fehler-Anzeige (CenterPanel)
export const MAX_MATCH_MINUTE = 120; // inkl. Verlängerung

// ── Publish-Phasen (Social-Media Panels) ─────────────────────
export const PUBLISH_PHASES = [
  { value: "", label: "Spielminute" },
  { value: "Before", label: "Pre Match" },
  { value: "Halftime", label: "Halbzeit" },
  { value: "After", label: "After Match" },
];

// ── Phasen-Sortierung (für Frontend-Ticker-Reihenfolge) ──────
// Fester Minuten-Wert für Phasen-Events; null = sortiere nach t.minute
export const PHASE_SORT = {
  Before: -1,
  FirstHalf: null,
  FirstHalfBreak: 45.5,
  Halftime: 45.5,
  SecondHalf: null,
  SecondHalfBreak: 90.5,
  ExtraFirstHalf: null,
  ExtraBreak: 105.5,
  ExtraSecondHalf: null,
  ExtraSecondHalfBreak: 120.5,
  PenaltyShootout: null,
  After: 999,
};
// Fallback-Minuten wenn minute: null aber Phase bekannt
export const PHASE_MINUTE_DEFAULT = {
  FirstHalf: 1,
  SecondHalf: 46,
  ExtraFirstHalf: 91,
  ExtraSecondHalf: 106,
  PenaltyShootout: 121,
};
// Phasen, die einen Spielabschnitt starten (erscheinen zuerst in ihrer Minute)
export const PHASE_START = new Set([
  "FirstHalf",
  "SecondHalf",
  "ExtraFirstHalf",
  "ExtraSecondHalf",
  "PenaltyShootout",
]);

// ── Phasen-Label (Deutsch) ────────────────────────────────────
// Einzige Quelle für Phase → lesbaren Namen-Mapping im Frontend.
export const PHASE_LABEL = {
  Before: "Vorberichterstattung",
  PreMatch: "Vorberichterstattung",
  FirstHalf: "Anpfiff 1. HZ",
  FirstHalfBreak: "Abpfiff 1. HZ",
  Halftime: "Halbzeitbericht",
  SecondHalf: "Anpfiff 2. HZ",
  FullTime: "Abpfiff 2. HZ",
  After: "Abpfiff 2. HZ",
  ExtraFirstHalf: "Verlängerung",
  ExtraBreak: "VZ-Pause",
  ExtraSecondHalf: "Verlängerung 2. HZ",
  PenaltyShootout: "Elfmeterschießen",
};

// ── Vorberichts-Phasen ────────────────────────────────────────
export const PREMATCH_PHASES = new Set(["Before", "PreMatch"]);

// ── Kurzbezeichnungen für Phasen (Minuten-Spalte im Ticker) ──
// Kurze Anzeige-Labels z.B. "HZ", "FT" — getrennt von PHASE_LABEL (vollständige Namen).
// null = Phase bekannt, aber Minutenspalte bleibt leer.
export const PHASE_SHORT_LABEL: Partial<Record<string, string | null>> = {
  Before: "i",
  FullTime: null, // null → echte Minute zeigen wenn vorhanden
  Halftime: "i", // Halbzeitbericht via Halftime-Phase → Info-Icon (kein minute-Wert)
  FirstHalfBreak: null, // null → echte Minute zeigen wenn vorhanden (z.B. 45')
  SecondHalfBreak: "Pause",
  ExtraBreak: "VZ·P",
  ExtraSecondHalfBreak: "Elfm.P",
  ExtraFirstHalf: "VZ1",
  ExtraSecondHalf: "VZ2",
  PenaltyShootout: "Elfm.",
};

// ── Standard-Icons für Phasen-Events (Manual-Einträge) ───────
export const PHASE_DEFAULT_ICON = {
  FirstHalf: "📣",
  SecondHalf: "📣",
  ExtraFirstHalf: "📣",
  ExtraSecondHalf: "📣",
  FirstHalfBreak: "📣",
  SecondHalfBreak: "📣",
  ExtraBreak: "📣",
  After: "📣",
  FullTime: "📣",
  PenaltyShootout: "🥅",
};

// ── Command-Prefix-Regex ──────────────────────────────────────
// Matcht /command + whitespace am Anfang (z.B. "/g " oder "/gelb ").
export const COMMAND_PREFIX_REGEX = /^\/\w+\s*/;

// ── Statistik-Einträge (n8n live-stats-monitor Workflow) ─────
// Dieses Icon identifiziert KI-generierte Statistik-Updates im Frontend.
export const STATS_ENTRY_ICON = "📊";

// ── Standard-Icons für Medien-Einträge ────────────────────────
export const MEDIA_DEFAULT_ICONS = ["🎬", "📷", "📸"];

// ── URL-Pattern-Erkennung (Social Media) ─────────────────────
// Werden in PublishedEntry + anderen Komponenten genutzt.
export const URL_PATTERNS = {
  twitter: /x\.com|twitter\.com/,
  instagram: /instagram\.com/,
  youtube: /youtube\.com|youtu\.be/,
};

// ── KI-Schreibstil-Metadaten ──────────────────────────────────
// Wird in AIDraft, SummaryDraftCard und StylePickerDropdown genutzt.
export const STYLE_META = {
  neutral: { emoji: "⚪", label: "Neutral" },
  euphorisch: { emoji: "🔥", label: "Euphorisch" },
  kritisch: { emoji: "⚡", label: "Kritisch" },
};

// ── Social Media Brand-Stile ──────────────────────────────────
export const INSTA_GRADIENT =
  "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)";

// ── API-Status Anzeige-Konfiguration ─────────────────────────
export const API_STATUS_CFG = {
  checking: { dot: "#6b7385", label: "Verbinde…" },
  ok: { dot: "#22c55e", label: "Bereit" },
  degraded: { dot: "#f59e0b", label: "Degradiert" },
  offline: { dot: "#ef4444", label: "Offline" },
};
