// ============================================================
// src/types/index.ts
// Gemeinsame Domain-Typen für den LiveTicker
// ============================================================

// ── Ticker-Modi ───────────────────────────────────────────────
export type TickerMode = "auto" | "coop" | "manual";

// ── Ticker-Styles ─────────────────────────────────────────────
export type TickerStyle = "neutral" | "euphorisch" | "kritisch";

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
  /** camelCase from alias_generator */
  homeTeamId?: number;
  awayTeamId?: number;
  /** serialization_alias from single-match endpoint */
  teamHomeId?: number;
  teamAwayId?: number;
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
  kickoff?: string | null;
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

// ── TickerEntry (snake_case matches API response format) ──────
export interface TickerEntry {
  id: number;
  match_id: number;
  text: string;
  status: "draft" | "published" | "rejected";
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

// ── Player ───────────────────────────────────────────────────
export interface Player {
  id: number;
  externalId?: number | null;
  firstName?: string | null;
  lastName?: string | null;
  knownName?: string | null;
  displayName?: string | null;
}

// ── LineupEntry ───────────────────────────────────────────────
export interface LineupEntry {
  id: number;
  playerId: number;
  teamId: number;
  playerName?: string | null;
  status?: "Start" | "Sub" | "Coach" | string;
  position?: string | null;
  jerseyNumber?: number | null;
  formation?: string | null;
  numberOfGoals?: number;
  hasYellowCard?: boolean;
  hasRedCard?: boolean;
  isSubstituted?: boolean;
}

// ── PlayerStat ────────────────────────────────────────────────
export interface PlayerStat {
  id?: number;
  playerId: number;
  teamId: number;
  jerseyNumber?: number | null;
  rating?: number | null;
  goals?: number;
  assists?: number;
  shotsOnTarget?: number;
  passesTotal?: number;
  tacklesTotal?: number;
  cardsYellow?: number;
  cardsRed?: number;
  minutes?: number | null;
}

// ── MatchStat ─────────────────────────────────────────────────
export interface MatchStat {
  teamId: number;
  possessionPercentage?: number | null;
  goalScoringAttempt?: number | null;
  goalOnTargetScoringAttempt?: number | null;
  totalPass?: number | null;
  cornerTaken?: number | null;
  fouls?: number | null;
  totalOffside?: number | null;
  [key: string]: unknown;
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

// ── InjuryGroup ───────────────────────────────────────────────
export interface InjuryPlayer {
  player_name?: string;
  name?: string;
  reason?: string;
}

export interface InjuryGroup {
  team_id?: number;
  team_name?: string;
  players?: InjuryPlayer[];
}
