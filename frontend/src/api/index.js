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
  api.get(`/teams/${teamId}/competitions/${competitionId}/matchdays/${round}/matches`);

// ── Matches ────────────────────────────────────────────
export const fetchMatch = (id) => api.get(`/matches/${id}`);
export const fetchTodayMatches = () => api.get("/matches/today");
export const fetchLiveMatches = () => api.get("/matches/live");

// ── Events ─────────────────────────────────────────────
export const fetchEvents = (matchId) => api.get(`/matches/${matchId}/events`);

// ── Ticker ─────────────────────────────────────────────
export const fetchTickerTexts = (matchId) =>
  api.get(`/ticker/match/${matchId}`);
export const fetchPrematch = (matchId) =>
  api.get(`/ticker/match/${matchId}`);
export const fetchLiveStats = (matchId) =>
  api.get(`/matches/${matchId}/statistics`);
export const generateTicker = (eventId, style) =>
  api.post(`/ticker/generate/${eventId}?style=${style}`);
export const createManualTicker = (matchId, text, icon = "📝", minute) =>
  api.post("/ticker/", {
    match_id: matchId,
    text,
    mode: "manual",
    language: "de",
    minute,
    icon,
  });
export const publishTicker = (entryId, text) =>
  api.patch(`/ticker/${entryId}`, { text, status: "published" });
export const updateTicker = (entryId, data) =>
  api.patch(`/ticker/${entryId}`, data);

// ── Stats / Lineups ────────────────────────────────────
export const fetchLineups = (matchId) => api.get(`/matches/${matchId}/lineup`);
export const fetchMatchStats = (matchId) =>
  api.get(`/matches/${matchId}/statistics`);
export const fetchPlayerStats = (matchId) =>
  api.get(`/matches/${matchId}/statistics`);

// ── Favorites ──────────────────────────────────────────
export const fetchFavorites = () => api.get("/favorites/?user_id=1");
export const fetchFavoriteMatches = () =>
  api.get("/favorites/matches?user_id=1");
export const addFavorite = (teamId) =>
  api.post("/favorites/", { user_id: 1, team_id: teamId });
export const removeFavorite = (teamId) =>
  api.delete(`/favorites/${teamId}?user_id=1`);

// ── n8n Webhooks ───────────────────────────────────────
export const importCountries = () =>
  n8n.post("/import-countries");

export const importTeamsByCountry = (country, season) =>
  n8n.post("/import-teams-by-country", { country, season });

export const importCompetitionsForTeam = (teamId, season) =>
  n8n.post("/import-competitions", { teamId, season });

export const importLineups = (matchId) =>
  n8n.post("/lineups", { match_id: matchId });

export const importMatchStats = (matchId) =>
  n8n.post("/match-statistics", { match_id: matchId });

export const importPrematch = (fixtureId) =>
  n8n.post("/import-prematch", { fixture_id: fixtureId });
