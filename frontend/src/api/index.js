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

// ── Events ─────────────────────────────────────────────
export const fetchEvents = (matchId) => api.get(`/matches/${matchId}/events`);

// ── Ticker ─────────────────────────────────────────────
export const fetchTickerTexts = (matchId) =>
  api.get(`/ticker/match/${matchId}?all_entries=true`);
export const fetchPrematch = (matchId) => api.get(`/ticker/match/${matchId}`);
export const fetchLiveStats = (matchId) =>
  api.get(`/matches/${matchId}/statistics`);
export const generateTicker = (eventId, style, instance = "ef_whitelabel") =>
  api.post(`/ticker/generate/${eventId}`, { style, instance });
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
export const generateSyntheticBatch = (matchId, style = "neutral", instance = "ef_whitelabel") =>
  api.post(`/ticker/generate-synthetic-batch/${matchId}`, { style, instance, auto_publish: true });
export const generateMatchPhases = (matchId, style = "neutral", instance = "ef_whitelabel") =>
  api.post(`/ticker/generate-match-phases/${matchId}`, { style, instance, auto_publish: true });

// ── Stats / Lineups ────────────────────────────────────
export const fetchLineups = (matchId) => api.get(`/matches/${matchId}/lineup`);
export const fetchMatchStats = (matchId) =>
  api.get(`/matches/${matchId}/statistics`);
export const fetchPlayerStats = (matchId) =>
  api.get(`/matches/${matchId}/player-statistics`);

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

export const importMatchesForTeam = (teamId, leagueId, season) =>
  n8n.post("/import-matches", { teamId, leagueId, season });

export const triggerMatchStatus = (fixtureId, status, minute) =>
  n8n.post("/match-status", { fixture_id: fixtureId, status, minute: minute ?? null });
export const triggerMatchPhases = (fixtureId, minute) =>
  n8n.post("/match-phases", { fixture_id: fixtureId, minute: minute ?? null });
