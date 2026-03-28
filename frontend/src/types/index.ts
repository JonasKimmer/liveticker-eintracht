// ============================================================
// src/types/index.ts
// Gemeinsame Domain-Typen für den LiveTicker
// ============================================================

// ── Ticker-Modi ───────────────────────────────────────────────
export type TickerMode = "auto" | "coop" | "manual";

// ── Ticker-Styles ─────────────────────────────────────────────
export type TickerStyle = "neutral" | "euphorisch" | "kritisch";

// ── Ticker-Status ─────────────────────────────────────────────
export type TickerStatus = "draft" | "published" | "rejected";

// ── Match-Phase ───────────────────────────────────────────────
export type MatchPhase =
  | "Before"
  | "PreMatch"
  | "FirstHalf"
  | "FirstHalfBreak"
  | "Halftime"
  | "SecondHalf"
  | "SecondHalfBreak"
  | "ExtraFirstHalf"
  | "ExtraBreak"
  | "ExtraSecondHalf"
  | "ExtraSecondHalfBreak"
  | "PenaltyShootout"
  | "FullTime"
  | "After";

// ── Team ─────────────────────────────────────────────────────
export interface Team {
  id: number;
  name: string;
  initials?: string;
  externalId?: number;
  logoUrl?: string;
}

// ── Competition ───────────────────────────────────────────────
export interface Competition {
  id: number;
  /** camelCase from alias_generator */
  title?: string | null;
  shortTitle?: string | null;
  sport?: string;
  externalId?: number;
  logoUrl?: string;
  hidden?: boolean;
}

// ── Match ─────────────────────────────────────────────────────
export interface Match {
  id: number;
  homeTeamId: number;
  awayTeamId: number;
  homeTeam?: Team;
  awayTeam?: Team;
  /** from matchday-list endpoint (alias_generator camelCase) */
  homeScore?: number | null;
  awayScore?: number | null;
  /** from single-match endpoint (explicit serialization_alias) */
  teamHomeScore?: number | null;
  teamAwayScore?: number | null;
  matchState?: string | null;
  matchPhase?: MatchPhase | null;
  minute?: number | null;
  matchday?: number | null;
  startsAt?: string | null;
  tickerMode?: TickerMode;
  externalId?: number;
}

// ── MatchEvent (snake_case matches API response format) ───────
export interface MatchEvent {
  id: number;
  match_id: number;
  event_type: string;
  /** @deprecated use event_type */
  eventType?: string;
  time?: number | null;
  minute?: number | null;
  phase?: MatchPhase | null;
  team_id?: number | null;
  player_name?: string | null;
  description?: string | null;
  position?: number;
  external_id?: number | null;
  sourceId?: number | null;
  liveTickerEventType?: string | null;
  /** fallback alias used by some API responses */
  type?: string | null;
  detail?: string | null;
}

// ── SyntheticEvent ────────────────────────────────────────────
export interface SyntheticEvent {
  id: number;
  matchId: number;
  eventType: string;
  phase?: MatchPhase | null;
  minute?: number | null;
  position?: number;
  description?: string | null;
}

// ── TickerEntry (snake_case matches API response format) ──────
export interface TickerEntry {
  id: number;
  match_id: number;
  text: string;
  status: TickerStatus;
  source: "ai" | "manual";
  style?: TickerStyle | null;
  icon?: string | null;
  minute?: number | null;
  phase?: MatchPhase | null;
  event_id?: number | null;
  synthetic_event_id?: number | null;
  llm_model?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  created_at?: string;
}

// ── PublishToast ──────────────────────────────────────────────
export interface PublishToast {
  id: number;
  text: string;
  isManual: boolean;
}

// ── MediaItem ─────────────────────────────────────────────────
export interface MediaItem {
  id: number;
  url?: string | null;
  thumbnailUrl?: string | null;
  description?: string | null;
  caption?: string | null;
  status?: string | null;
  createdAt?: string;
}

// ── Clip ──────────────────────────────────────────────────────
export interface Clip {
  id: number;
  title?: string | null;
  url?: string | null;
  thumbnailUrl?: string | null;
  description?: string | null;
  draft?: string | null;
  platform?: string | null;
  createdAt?: string;
}

// ── Reload ────────────────────────────────────────────────────
export interface ReloadFunctions {
  loadTickerTexts: () => Promise<void>;
  loadMatch?: () => Promise<void>;
  loadEvents?: () => Promise<void>;
}

// ── PublishPayload ────────────────────────────────────────────
export interface PublishPayload {
  text?: string;
  icon?: string | null;
  minute?: number | null;
  phase?: MatchPhase | null;
}

// ── RoundLabel ────────────────────────────────────────────────
export interface RoundLabel {
  short: (r: number | string) => string;
  full: (r: number | string) => string;
}
