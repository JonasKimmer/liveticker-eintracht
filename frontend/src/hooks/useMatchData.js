import { useState, useEffect, useCallback, useRef } from "react";
import * as api from "../api";
import logger from "../utils/logger";

/**
 * Gibt das Polling-Intervall in ms basierend auf dem Spielstatus zurück.
 * Live-Spiele werden aggressiv gepollert, Pre- und Post-Match deutlich seltener.
 */
function resolvePollingInterval(matchState) {
  if (matchState === "Live") return 5_000;
  if (matchState === "FullTime") return 30_000;
  return 60_000; // PreMatch, Cancelled, etc.
}

/**
 * Lädt alle Daten für ein Spiel (Match, Events, Ticker, Lineup, Statistiken)
 * und pollt sie je nach Spielstatus automatisch in Echtzeit.
 *
 * @param {number|null} selectedMatchId - Interne Match-ID oder null.
 * @returns {{ match, events, tickerTexts, prematch, lineups, matchStats, players, playerStats, leagueSeason, reload: () => void }}
 */
export function useMatchData(selectedMatchId) {
  const [match, setMatch] = useState(null);
  const [events, setEvents] = useState([]);
  const [tickerTexts, setTickerTexts] = useState([]);
  const [prematch, setPrematch] = useState([]);
  const [lineups, setLineups] = useState([]);
  const [matchStats, setMatchStats] = useState([]);
  const [players, setPlayers] = useState([]);
  const [playerStats, setPlayerStats] = useState([]);
  const [injuries, setInjuries] = useState([]);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef(null);
  // Ref hält aktuelle Match-Daten synchron für loadPlayers
  const matchRef = useRef(null);

  // Generic loader: fetches data and sets state, with optional transform
  const _load = useCallback(async (fetchFn, setFn, transform) => {
    if (!selectedMatchId) return;
    try {
      const res = await fetchFn(selectedMatchId);
      setFn(transform ? transform(res.data) : res.data);
    } catch (err) {
      logger.error(`[useMatchData] ${fetchFn.name} failed:`, err);
    }
  }, [selectedMatchId]);

  // loadMatch is separate: it also updates matchRef for loadPlayers
  const loadMatch = useCallback(async () => {
    if (!selectedMatchId) return;
    try {
      const res = await api.fetchMatch(selectedMatchId);
      matchRef.current = res.data;
      setMatch(res.data);
    } catch (err) {
      logger.error("[useMatchData] fetchMatch failed:", err);
    }
  }, [selectedMatchId]);

  const loadEvents      = useCallback(() => _load(api.fetchEvents,     setEvents,     (d) => [...(d?.items ?? d ?? [])].reverse()), [_load]);
  const loadTickerTexts = useCallback(() => _load(api.fetchTickerTexts, setTickerTexts), [_load]);
  const loadPrematch    = useCallback(() => _load(api.fetchPrematch,    setPrematch),    [_load]);
  const loadLineups     = useCallback(() => _load(api.fetchLineups,     setLineups),     [_load]);
  const loadMatchStats  = useCallback(() => _load(api.fetchMatchStats,  setMatchStats),  [_load]);
  const loadPlayerStats = useCallback(() => _load(api.fetchPlayerStats, setPlayerStats), [_load]);
  const loadInjuries    = useCallback(() => _load(api.fetchInjuries,    setInjuries,   (d) => d ?? []), [_load]);

  // loadPlayers liest Team-IDs aus matchRef (setzt loadMatch voraus)
  const loadPlayers = useCallback(async () => {
    const m = matchRef.current;
    const teamIds = [m?.teamHomeId, m?.teamAwayId].filter(Boolean);
    if (!teamIds.length) return;
    try {
      const results = await Promise.all(teamIds.map((id) => api.fetchPlayers(id)));
      const allPlayers = results.flatMap((r) => r.data?.items ?? []);
      setPlayers(allPlayers);
    } catch (err) {
      logger.error("loadPlayers error:", err);
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!selectedMatchId) return;
    matchRef.current = null;
    setMatch(null);
    setEvents([]);
    setTickerTexts([]);
    setPrematch([]);
    setLineups([]);
    setMatchStats([]);
    setPlayers([]);
    setPlayerStats([]);
    setInjuries([]);
    setLoading(true);

    // loadMatch zuerst, dann loadPlayers (braucht teamIds aus Match)
    const matchAndPlayers = loadMatch().then(() => {
      loadPlayers();
    });

    Promise.all([
      matchAndPlayers,
      loadEvents(),
      loadTickerTexts(),
      loadPrematch(),
      loadMatchStats(),
      loadLineups(),
      loadPlayerStats(),
      loadInjuries(),
    ]).finally(() => setLoading(false));

    const t1 = setTimeout(() => {
      loadLineups();
      loadMatchStats();
      loadMatch().then(() => loadPlayers());
      loadPrematch();
    }, 5000);
    const t2 = setTimeout(() => {
      loadLineups();
      loadMatchStats();
      loadMatch().then(() => loadPlayers());
      loadPrematch();
    }, 15000);

    const pollInterval = resolvePollingInterval(matchRef.current?.matchState);
    intervalRef.current = setInterval(() => {
      loadEvents();
      loadTickerTexts();
      loadMatchStats();
      loadInjuries();
      loadMatch();
    }, pollInterval);

    return () => {
      clearInterval(intervalRef.current);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [selectedMatchId]);

  return {
    match,
    events,
    tickerTexts,
    prematch,
    lineups,
    matchStats,
    players,
    playerStats,
    injuries,
    loading,
    reload: { loadMatch, loadEvents, loadTickerTexts, loadPrematch, loadLineups, loadMatchStats, loadPlayers, loadPlayerStats, loadInjuries },
  };
}
