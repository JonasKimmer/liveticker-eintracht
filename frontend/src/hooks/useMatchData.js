import { useState, useEffect, useCallback, useRef } from "react";
import * as api from "../api";

/**
 * Gibt das Polling-Intervall in ms basierend auf dem Spielstatus zurück.
 * Live-Spiele werden aggressiv gepollert, Pre- und Post-Match deutlich seltener.
 */
function resolvePollingInterval(matchState) {
  if (matchState === "Live") return 5_000;
  if (matchState === "FullTime") return 30_000;
  return 60_000; // PreMatch, Cancelled, etc.
}

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

  const loadMatch = useCallback(async () => {
    if (!selectedMatchId) return;
    try {
      const res = await api.fetchMatch(selectedMatchId);
      matchRef.current = res.data;
      setMatch(res.data);
    } catch (err) {
      console.error("loadMatch error:", err);
    }
  }, [selectedMatchId]);

  const loadEvents = useCallback(async () => {
    if (!selectedMatchId) return;
    try {
      const res = await api.fetchEvents(selectedMatchId);
      const items = res.data?.items ?? res.data ?? [];
      setEvents([...items].reverse());
    } catch (err) {
      console.error("loadEvents error:", err);
    }
  }, [selectedMatchId]);

  const loadTickerTexts = useCallback(async () => {
    if (!selectedMatchId) return;
    try {
      const res = await api.fetchTickerTexts(selectedMatchId);
      setTickerTexts(res.data);
    } catch (err) {
      console.error("loadTickerTexts error:", err);
    }
  }, [selectedMatchId]);

  const loadPrematch = useCallback(async () => {
    if (!selectedMatchId) return;
    try {
      const res = await api.fetchPrematch(selectedMatchId);
      setPrematch(res.data);
    } catch (err) {
      console.error("loadPrematch error:", err);
    }
  }, [selectedMatchId]);

  const loadLineups = useCallback(async () => {
    if (!selectedMatchId) return;
    try {
      const res = await api.fetchLineups(selectedMatchId);
      setLineups(res.data);
    } catch (err) {
      console.error("loadLineups error:", err);
    }
  }, [selectedMatchId]);

  const loadMatchStats = useCallback(async () => {
    if (!selectedMatchId) return;
    try {
      const res = await api.fetchMatchStats(selectedMatchId);
      setMatchStats(res.data);
    } catch (err) {
      console.error("loadMatchStats error:", err);
    }
  }, [selectedMatchId]);

  const loadPlayerStats = useCallback(async () => {
    if (!selectedMatchId) return;
    try {
      const res = await api.fetchPlayerStats(selectedMatchId);
      setPlayerStats(res.data);
    } catch (err) {
      console.error("loadPlayerStats error:", err);
    }
  }, [selectedMatchId]);

  const loadInjuries = useCallback(async () => {
    if (!selectedMatchId) return;
    try {
      const res = await api.fetchInjuries(selectedMatchId);
      setInjuries(res.data ?? []);
    } catch (err) {
      console.error("loadInjuries error:", err);
    }
  }, [selectedMatchId]);

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
      console.error("loadPlayers error:", err);
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
    reload: { loadMatch, loadEvents, loadTickerTexts, loadPrematch, loadLineups, loadMatchStats, loadPlayers, loadPlayerStats },
  };
}
