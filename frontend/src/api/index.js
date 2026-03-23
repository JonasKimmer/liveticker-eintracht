import axios from "axios";
import config from "../config/whitelabel";

const api = axios.create({ baseURL: config.apiBase });
const n8n = axios.create({ baseURL: config.n8nBase });

// ── Teams ──────────────────────────────────────────────
export const fetchCountries = () => api.get("/teams/countries");
export const fetchTeamsByCountry = (country) =>
  api.get(`/teams/by-country/${encodeURIComponent(country)}`);

export const fetchTeams = () => api.get("/teams");
export const fetchPartnerTeams = () => api.get("/teams/partners");

// Team-first Navigation
export const fetchTeamCompetitions = (teamId) =>
  api.get(`/teams/${teamId}/competitions`);
export const fetchTeamMatchdays = (teamId, competitionId) =>
  api.get(`/teams/${teamId}/competitions/${competitionId}/matchdays`);
export const fetchTeamMatchesByMatchday = (teamId, competitionId, round) =>
  api.get(
    `/teams/${teamId}/competitions/${competitionId}/matchdays/${round}/matches`,
  );

// ── Matches ────────────────────────────────────────────
export const fetchMatch = (id) => api.get(`/matches/${id}`);
export const syncLiveMatch = (id) => api.post(`/matches/${id}/sync-live`);

// ── Events ─────────────────────────────────────────────
export const fetchEvents = (matchId) => api.get(`/matches/${matchId}/events`);

// ── Ticker ─────────────────────────────────────────────
export const fetchTickerTexts = (matchId) =>
  api.get(`/ticker/match/${matchId}?all_entries=true`);
export const fetchPrematch = (matchId) => api.get(`/ticker/match/${matchId}`);
export const generateTicker = (eventId, style, instance = "ef_whitelabel", language = "de") =>
  api.post(`/ticker/generate/${eventId}`, { style, instance, language });
export const createManualTicker = (matchId, text, icon = "📝", minute, phase) =>
  api.post("/ticker/manual", {
    match_id: matchId,
    text,
    icon,
    minute: minute ?? null,
    phase: phase ?? null,
  });
export const publishTicker = (entryId, text) =>
  api.patch(`/ticker/${entryId}`, { text, status: "published" });
export const updateTicker = (entryId, data) =>
  api.patch(`/ticker/${entryId}`, data);
export const deleteTicker = (entryId) => api.delete(`/ticker/${entryId}`);
export const publishClipTicker = (matchId, text, videoUrl, thumbnailUrl, minute) =>
  api.post("/ticker/manual", {
    match_id: matchId,
    text,
    icon: "🎬",
    minute: minute ?? null,
    image_url: thumbnailUrl ?? null,
    video_url: videoUrl ?? null,
  });
export const generateSyntheticBatch = (matchId, style = "neutral", instance = "ef_whitelabel", language = "de") =>
  api.post(`/ticker/generate-synthetic-batch/${matchId}`, { style, instance, language, auto_publish: true });
export const generateMatchPhases = (matchId, style = "neutral", instance = "ef_whitelabel", language = "de") =>
  api.post(`/ticker/generate-match-phases/${matchId}`, { style, instance, language, auto_publish: true });
export const translateTickerBatch = (matchId, language) =>
  api.post(`/ticker/translate-batch/${matchId}`, { language });

// ── Stats / Lineups ────────────────────────────────────
export const fetchLineups = (matchId) => api.get(`/matches/${matchId}/lineup`);
export const fetchMatchStats = (matchId) =>
  api.get(`/matches/${matchId}/statistics`);
export const fetchPlayerStats = (matchId) =>
  api.get(`/matches/${matchId}/player-statistics`);
export const fetchInjuries = (matchId) =>
  api.get(`/matches/${matchId}/injuries`);

// ── Players ────────────────────────────────────────────
export const fetchPlayers = (teamId) =>
  api.get(`/players?teamId=${teamId}&pageSize=100`);
export const createPlayer = (data) => api.post("/players", data);
export const updatePlayer = (playerId, data) =>
  api.put(`/players/${playerId}`, data);
export const deletePlayer = (playerId) => api.delete(`/players/${playerId}`);
export const updatePlayerStats = (playerId, statistics) =>
  api.patch(`/players/${playerId}/statistics`, { statistics });

// ── Media ───────────────────────────────────────────────
export const generateMediaCaption = (mediaId, style = "neutral", instance = "ef_whitelabel") =>
  api.post(`/media/generate-caption/${mediaId}`, { style, instance });
export const fetchMediaQueue = () => api.get("/media/queue");
export const clearMediaQueue = () => api.delete("/media/queue");
export const publishMedia = ({ mediaId, description, matchId, minute, icon }) =>
  api.post("/media/publish", {
    media_id: mediaId,
    description,
    match_id: matchId,
    minute: minute ? Number(minute) : null,
    icon: icon ?? null,
  });

// ── n8n Webhooks ───────────────────────────────────────
export const importCountries = () => n8n.post("/import-countries");

export const importTeamsByCountry = (country, season) =>
  n8n.post("/import-teams-by-country", { country, season });

export const importCompetitionsForTeam = (teamId, season) =>
  n8n.post("/import-competitions", { teamId, season });

export const importEvents = (fixtureId) =>
  n8n.post("/Events", { fixture_id: fixtureId });

export const importLineups = (matchId) =>
  n8n.post("/lineups", { match_id: matchId });

export const importMatchStats = (matchId) =>
  n8n.post("/match-statistics", { match_id: matchId });

export const importPrematch = (fixtureId) =>
  n8n.post("/import-prematch", { fixture_id: fixtureId });

export const importPlayerStatistics = (matchId) =>
  n8n.post("/player-statistics", { match_id: matchId });

export const fetchGoalClips = (matchId) => n8n.post("/Tor Clip", matchId ? { match_id: matchId } : {});
export const triggerYoutubeScrape = () => n8n.post("/3555f418-e7a5-4d9b-ac87-5b591b4bc0d0");
export const triggerTwitterImport = () => n8n.post("/d76610a7-a103-4dfd-b40d-dec3caa8a9f4");
export const triggerInstagramImport = () => n8n.post("/149b541b-34f0-44f8-b3ce-c66bd3d75714");

// ── Clips (persistent DB) ───────────────────────────────────
export const fetchClips = (matchId, teamName) =>
  api.get(`/clips/match/${matchId}${teamName ? `?team_name=${encodeURIComponent(teamName)}` : ""}`);
export const fetchYoutubeClips = () => api.get("/clips/youtube");
export const fetchTwitterPosts = () => api.get("/clips/twitter");
export const fetchInstagramPosts = () => api.get("/clips/instagram");
export const generateClipDraft = (clipId, matchId, style = "euphorisch") =>
  api.post(`/clips/${clipId}/draft?match_id=${matchId}&style=${style}`);
export const generateYoutubeDraft = (clipId, style = "neutral") =>
  api.post(`/clips/${clipId}/draft?match_id=0&style=${style}`);
export const publishClip = (clipId, matchId, text, minute, phase, icon) =>
  api.post(`/clips/${clipId}/publish`, { match_id: matchId, text, minute: minute ?? null, phase: phase ?? null, icon: icon ?? null });
export const deleteClip = (clipId) => api.delete(`/clips/${clipId}`);

export const importMatchesForTeam = (teamId, leagueId, season) =>
  n8n.post("/import-matches", { teamId, leagueId, season });

export const triggerMatchStatus = (fixtureId, status, minute, instance = "generic", language = "de", style = "neutral") =>
  n8n.post("/match-status", { fixture_id: fixtureId, status, minute: minute ?? null, instance, language, style });
export const triggerMatchPhases = (fixtureId, minute, instance = "generic", language = "de") =>
  n8n.post("/match-phases", { fixture_id: fixtureId, minute: minute ?? null, instance, language });
export const generateMatchSummary = (matchId, phase, style = "emotional", instance = "generic", language = "de") =>
  n8n.post("/match-summary", { match_id: matchId, phase, style, instance, language });

export const triggerLiveStatsMonitor = (matchId, instance = "generic", language = "de") =>
  n8n.post("/live-stats-monitor", { match_id: matchId, instance, language });

export const triggerMinuteUpdate = (fixtureId) =>
  n8n.post("/update-minute", { fixture_id: fixtureId });
