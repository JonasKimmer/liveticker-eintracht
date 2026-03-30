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

export const fetchTeams = () => api.get("/teams");
export const fetchPartnerTeams = () => api.get("/teams/partners");

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
export const syncLiveMatch = (id: number) =>
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
  force = false,
) => api.post(`/ticker/generate/${eventId}`, { style, instance, language, force });
export const createManualTicker = (
  matchId: number,
  text: string,
  icon = "📝",
  minute?: number | null,
  phase?: MatchPhase | null,
) =>
  api.post("/ticker/manual", {
    match_id: matchId,
    text,
    icon,
    minute: minute ?? null,
    phase: phase ?? null,
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
export const publishClipTicker = (
  matchId: number,
  text: string,
  videoUrl: string,
  thumbnailUrl: string | null,
  minute: number | null,
) =>
  api.post("/ticker/manual", {
    match_id: matchId,
    text,
    icon: "🎬",
    minute: minute ?? null,
    image_url: thumbnailUrl ?? null,
    video_url: videoUrl ?? null,
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
export const generateSynthetic = (
  syntheticEventId: number,
  style = "neutral",
  autoPublish = false,
) =>
  api.post(`/ticker/generate-synthetic`, {
    synthetic_event_id: syntheticEventId,
    style,
    auto_publish: autoPublish,
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
export const createPlayer = (data: Record<string, unknown>) =>
  api.post("/players", data);
export const updatePlayer = (playerId: number, data: Record<string, unknown>) =>
  api.put(`/players/${playerId}`, data);
export const deletePlayer = (playerId: number) =>
  api.delete(`/players/${playerId}`);
export const updatePlayerStats = (
  playerId: number,
  statistics: Record<string, unknown>,
) => api.patch(`/players/${playerId}/statistics`, { statistics });

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
  icon,
}: {
  mediaId: number;
  description: string;
  matchId: number;
  minute?: number | null;
  icon?: string | null;
}) =>
  api.post("/media/publish", {
    media_id: mediaId,
    description,
    match_id: matchId,
    minute: minute ? Number(minute) : null,
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

export const importPrematch = (fixtureId: number, tickerMode = "coop") =>
  n8n.post("/import-prematch", {
    fixture_id: fixtureId,
    ticker_mode: tickerMode,
  });

export const importPlayerStatistics = (matchId: number) =>
  n8n.post("/player-statistics", { match_id: matchId });

export const fetchGoalClips = (matchId: number) =>
  n8n.post("/Tor Clip", matchId ? { match_id: matchId } : {});
export const triggerYoutubeScrape = () =>
  n8n.post("/3555f418-e7a5-4d9b-ac87-5b591b4bc0d0");
export const triggerTwitterImport = () =>
  n8n.post("/d76610a7-a103-4dfd-b40d-dec3caa8a9f4");
export const triggerInstagramImport = () =>
  n8n.post("/149b541b-34f0-44f8-b3ce-c66bd3d75714");

// ── Clips (persistent DB) ───────────────────────────────────
export const fetchClips = (matchId: number, teamName?: string) =>
  api.get(
    `/clips/match/${matchId}${teamName ? `?team_name=${encodeURIComponent(teamName)}` : ""}`,
  );
export const fetchYoutubeClips = () => api.get("/clips/youtube");
export const fetchTwitterPosts = () => api.get("/clips/twitter");
export const fetchInstagramPosts = () => api.get("/clips/instagram");
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
export const triggerMatchPhases = (
  fixtureId: number,
  minute: number | null,
  instance = "generic",
  language = "de",
) =>
  n8n.post("/match-phases", {
    fixture_id: fixtureId,
    minute: minute ?? null,
    instance,
    language,
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
) => n8n.post("/live-stats-monitor", { match_id: matchId, instance, language });

export const triggerMinuteUpdate = (fixtureId: number) =>
  n8n.post("/update-minute", { fixture_id: fixtureId });

// ── Settings ────────────────────────────────────────────
export const fetchSettings = (): Promise<
  AxiosResponse<Record<string, string>>
> => api.get("/settings");

export const updateSetting = (
  key: string,
  value: string,
): Promise<AxiosResponse> => api.patch("/settings", { key, value });
