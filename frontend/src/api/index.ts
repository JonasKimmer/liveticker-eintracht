import axios, { type AxiosResponse } from "axios";
import config from "../config/whitelabel";
import type {
  Match,
  MatchEvent,
  TickerEntry,
  TickerMode,
  TickerStyle,
  MatchPhase,
} from "../types";

const api = axios.create({ baseURL: config.apiBase });
const n8n = axios.create({ baseURL: config.n8nBase });

// ── Teams ──────────────────────────────────────────────
export const fetchCountries = (): Promise<AxiosResponse<string[]>> =>
  api.get("/teams/countries");
export const fetchTeamsByCountry = (country: string) =>
  api.get(`/teams/by-country/${encodeURIComponent(country)}`);

// Team-first Navigation
export const fetchTeamCompetitions = (teamId: number) =>
  api.get(`/teams/${teamId}/competitions`);
export const fetchTeamMatchdays = (teamId: number, competitionId: number) =>
  api.get(`/teams/${teamId}/competitions/${competitionId}/matchdays`);
export const fetchTeamMatchesByMatchday = (
  teamId: number,
  competitionId: number,
  round: number,
) =>
  api.get(
    `/teams/${teamId}/competitions/${competitionId}/matchdays/${round}/matches`,
  );

// ── Matches ────────────────────────────────────────────
export const fetchMatch = (id: number): Promise<AxiosResponse<Match>> =>
  api.get(`/matches/${id}`);
export const syncMatchLive = (id: number): Promise<AxiosResponse<Match>> =>
  api.post(`/matches/${id}/sync-live`);
export const setMatchTickerMode = (matchId: number, mode: TickerMode) =>
  api.patch(`/matches/${matchId}/ticker-mode`, { mode });

// ── Events ─────────────────────────────────────────────
export const fetchEvents = (
  matchId: number,
): Promise<AxiosResponse<{ items: MatchEvent[] } | MatchEvent[]>> =>
  api.get(`/matches/${matchId}/events`);

// ── Ticker ─────────────────────────────────────────────
export const fetchTickerTexts = (
  matchId: number,
): Promise<AxiosResponse<TickerEntry[]>> =>
  api.get(`/ticker/match/${matchId}?all_entries=true`);
export const fetchPrematch = (
  matchId: number,
): Promise<AxiosResponse<TickerEntry[]>> => api.get(`/ticker/match/${matchId}`);
export const generateTicker = (
  eventId: number,
  style: TickerStyle,
  instance = "ef_whitelabel",
  language = "de",
) => api.post(`/ticker/generate/${eventId}`, { style, instance, language });
export const createManualTicker = (
  matchId: number,
  text: string,
  icon?: string,
  minute?: number | null,
  phase?: MatchPhase | null,
  status?: string,
) =>
  api.post("/ticker/manual", {
    match_id: matchId,
    text,
    ...(icon != null ? { icon } : {}),
    minute: minute ?? null,
    phase: phase ?? null,
    ...(status != null ? { status } : {}),
  });
export const publishTicker = (
  entryId: number,
  text: string,
): Promise<AxiosResponse<TickerEntry>> =>
  api.patch(`/ticker/${entryId}`, { text, status: "published" });
export const updateTicker = (entryId: number, data: Partial<TickerEntry>) =>
  api.patch(`/ticker/${entryId}`, data);
export const deleteTicker = (entryId: number) =>
  api.delete(`/ticker/${entryId}`);
export const regenerateStatsEntry = (
  entryId: number,
  style: TickerStyle,
  instance = "ef_whitelabel",
  language = "de",
): Promise<AxiosResponse<TickerEntry>> =>
  api.post(`/ticker/${entryId}/regenerate-style`, null, {
    params: { style, instance, language },
  });
export const generateSyntheticEvent = (
  syntheticEventId: number,
  style = "neutral",
  instance = "ef_whitelabel",
  language = "de",
) =>
  api.post(`/ticker/generate-synthetic`, {
    synthetic_event_id: syntheticEventId,
    style,
    instance,
    language,
  });
export const generateSyntheticBatch = (
  matchId: number,
  style = "neutral",
  instance = "ef_whitelabel",
  language = "de",
  tickerMode = "coop",
) =>
  api.post(`/ticker/generate-synthetic-batch/${matchId}`, {
    style,
    instance,
    language,
    auto_publish: tickerMode === "auto",
  });
export const generateMatchPhases = (
  matchId: number,
  style = "neutral",
  instance = "ef_whitelabel",
  language = "de",
  autoPublish = true,
) =>
  api.post(`/ticker/generate-match-phases/${matchId}`, {
    style,
    instance,
    language,
    auto_publish: autoPublish,
  });
export const translateTickerBatch = (matchId: number, language: string) =>
  api.post(`/ticker/translate-batch/${matchId}`, { language });

// ── Stats / Lineups ────────────────────────────────────
export const fetchLineups = (matchId: number) =>
  api.get(`/matches/${matchId}/lineup`);
export const fetchMatchStats = (matchId: number) =>
  api.get(`/matches/${matchId}/statistics`);
export const fetchPlayerStats = (matchId: number) =>
  api.get(`/matches/${matchId}/player-statistics`);
export const fetchInjuries = (matchId: number) =>
  api.get(`/matches/${matchId}/injuries`);

// ── Players ────────────────────────────────────────────
export const fetchPlayers = (teamId: number) =>
  api.get(`/players?teamId=${teamId}&pageSize=100`);

// ── Media ───────────────────────────────────────────────
export const generateMediaCaption = (
  mediaId: number,
  style = "neutral",
  instance = "ef_whitelabel",
) => api.post(`/media/generate-caption/${mediaId}`, { style, instance });
export const fetchMediaQueue = () => api.get("/media/queue");
export const clearMediaQueue = () => api.delete("/media/queue");
export const publishMedia = ({
  mediaId,
  description,
  matchId,
  minute,
  phase,
  icon,
}: {
  mediaId: number;
  description: string;
  matchId: number;
  minute?: number | null;
  phase?: string | null;
  icon?: string | null;
}) =>
  api.post("/media/publish", {
    media_id: mediaId,
    description,
    match_id: matchId,
    minute: minute ? Number(minute) : null,
    phase: phase || null,
    icon: icon ?? null,
  });

// ── n8n Webhooks ───────────────────────────────────────
export const importCountries = () => n8n.post("/import-countries");

export const importTeamsByCountry = (
  country: string,
  season: number | string,
) => n8n.post("/import-teams-by-country", { country, season });

export const importCompetitionsForTeam = (
  teamId: number,
  season: number | string,
) => n8n.post("/import-competitions", { teamId, season });

export const importEvents = (fixtureId: number, tickerMode = "auto") =>
  n8n.post("/Events", { fixture_id: fixtureId, ticker_mode: tickerMode });

export const importLineups = (matchId: number) =>
  n8n.post("/lineups", { match_id: matchId });

export const importMatchStats = (matchId: number) =>
  n8n.post("/match-statistics", { match_id: matchId });

export const importPrematch = (fixtureId: number, tickerMode = "coop", instance = "generic") =>
  n8n.post("/import-prematch", {
    fixture_id: fixtureId,
    ticker_mode: tickerMode,
    instance,
  });

export const importPlayerStatistics = (matchId: number) =>
  n8n.post("/player-statistics", { match_id: matchId });

export const triggerYoutubeScrape = () =>
  n8n.post("/3555f418-e7a5-4d9b-ac87-5b591b4bc0d0");
export const triggerTwitterImport = () =>
  n8n.post("/d76610a7-a103-4dfd-b40d-dec3caa8a9f4");
export const triggerInstagramImport = () =>
  n8n.post("/149b541b-34f0-44f8-b3ce-c66bd3d75714");

// ── Clips (persistent DB) ───────────────────────────────────
export const fetchYoutubeClips = () =>
  api.get("/clips/by-source?source=youtube");
export const fetchTwitterPosts = () =>
  api.get("/clips/by-source?source=twitter");
export const fetchInstagramPosts = () =>
  api.get("/clips/by-source?source=instagram");
export const generateClipDraft = (
  clipId: number,
  matchId: number,
  style = "euphorisch",
) => api.post(`/clips/${clipId}/draft?match_id=${matchId}&style=${style}`);
export const generateYoutubeDraft = (clipId: number, style = "neutral") =>
  api.post(`/clips/${clipId}/draft?match_id=0&style=${style}`);
export const publishClip = (
  clipId: number,
  matchId: number,
  text: string,
  minute: number | null,
  phase: MatchPhase | null,
  icon: string | null,
) =>
  api.post(`/clips/${clipId}/publish`, {
    match_id: matchId,
    text,
    minute: minute ?? null,
    phase: phase ?? null,
    icon: icon ?? null,
  });
export const deleteClip = (clipId: number) => api.delete(`/clips/${clipId}`);

export const importMatchesForTeam = (
  teamId: number,
  leagueId: number,
  season: number | string,
) => n8n.post("/import-matches", { teamId, leagueId, season });

export const triggerMatchStatus = (
  fixtureId: number,
  status: string,
  minute: number | null,
  instance = "generic",
  language = "de",
  style = "neutral",
  tickerMode = "coop",
) =>
  n8n.post("/match-status", {
    fixture_id: fixtureId,
    status,
    minute: minute ?? null,
    instance,
    language,
    style,
    ticker_mode: tickerMode,
  });
export const generateMatchSummary = (
  matchId: number,
  phase: MatchPhase | string,
  style = "emotional",
  instance = "generic",
  language = "de",
  tickerMode = "coop",
) =>
  n8n.post("/match-summary", {
    match_id: matchId,
    phase,
    style,
    instance,
    language,
    ticker_mode: tickerMode,
  });

export const triggerLiveStatsMonitor = (
  matchId: number,
  instance = "generic",
  language = "de",
  tickerMode = "coop",
) => n8n.post("/live-stats-monitor", { match_id: matchId, instance, language, ticker_mode: tickerMode });

export const triggerMinuteUpdate = (fixtureId: number) =>
  n8n.post("/update-minute", { fixture_id: fixtureId });
