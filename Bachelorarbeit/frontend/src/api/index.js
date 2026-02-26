import axios from "axios";
import config from "../config/whitelabel";

const api = axios.create({ baseURL: config.apiBase });
const n8n = axios.create({ baseURL: config.n8nBase });

// ── Teams ──────────────────────────────────────────────
export const fetchCountries = () => api.get("/teams/countries");
export const fetchTeamsByCountry = (country) =>
  api.get(`/teams/by-country/${encodeURIComponent(country)}`);

export const fetchTeams = () => api.get("/teams/");
export const fetchPartnerTeams = () => api.get("/teams/partners");

// Team-first Navigation
export const fetchTeamCompetitions = (teamId) =>
  api.get(`/teams/${teamId}/competitions`);
export const fetchTeamMatchdays = (teamId, competitionId) =>
  api.get(`/teams/${teamId}/competitions/${competitionId}/matchdays`);
export const fetchTeamMatchesByMatchday = (teamId, competitionId, round) =>
  api.get(
    `/teams/${teamId}/competitions/${competitionId}/matchdays/${encodeURIComponent(round)}/matches`,
  );

// ── Leagues / Seasons (behalten für interne Nutzung) ──
export const fetchLeagues = () => api.get("/leagues/");
export const fetchSeasons = (leagueId) =>
  api.get(`/leagues/${leagueId}/seasons`);
export const fetchRounds = (lsId) => api.get(`/league-seasons/${lsId}/rounds`);

// ── Matches ────────────────────────────────────────────
export const fetchMatches = (lsId, round) =>
  api.get(
    `/matches/?league_season_id=${lsId}&round=${encodeURIComponent(round)}`,
  );
export const fetchMatch = (id) => api.get(`/matches/${id}`);
export const fetchTodayMatches = () => api.get("/matches/today");
export const fetchLiveMatches = () => api.get("/matches/live");

// ── Events ─────────────────────────────────────────────
export const fetchEvents = (matchId) => api.get(`/events/?match_id=${matchId}`);

// ── Ticker ─────────────────────────────────────────────
export const fetchTickerTexts = (matchId) =>
  api.get(`/ticker/match/${matchId}`);
export const fetchPrematch = (matchId) =>
  api.get(`/ticker/match/${matchId}/prematch`);
export const fetchLiveStats = (matchId) =>
  api.get(`/ticker/match/${matchId}/live`);
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
export const fetchLineups = (matchId) => api.get(`/lineups/match/${matchId}`);
export const fetchMatchStats = (matchId) =>
  api.get(`/match-statistics/match/${matchId}`);
export const fetchPlayerStats = (matchId) =>
  api.get(`/player-statistics/match/${matchId}`);

// ── Favorites ──────────────────────────────────────────
export const fetchFavorites = () => api.get("/favorites/?user_id=1");
export const fetchFavoriteMatches = () =>
  api.get("/favorites/matches?user_id=1");
export const addFavorite = (teamId) =>
  api.post("/favorites/", { user_id: 1, team_id: teamId });
export const removeFavorite = (teamId) =>
  api.delete(`/favorites/${teamId}?user_id=1`);

// ── n8n Webhooks ───────────────────────────────────────
export const importMatches = (leagueId, season, round) =>
  n8n.post("/import-matches", { league_id: leagueId, season, round });
