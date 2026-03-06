import { useState, useEffect, useCallback, useRef } from "react";
import * as api from "../api";

export function useMatchData(selectedMatchId) {
  const [match, setMatch] = useState(null);
  const [events, setEvents] = useState([]);
  const [tickerTexts, setTickerTexts] = useState([]);
  const [prematch, setPrematch] = useState([]);
  const [liveStats, setLiveStats] = useState([]);
  const [lineups, setLineups] = useState([]);
  const [matchStats, setMatchStats] = useState([]);
  const [playerStats, setPlayerStats] = useState([]);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef(null);

  const loadMatch = useCallback(async () => {
    if (!selectedMatchId) return;
    try {
      const res = await api.fetchMatch(selectedMatchId);
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

  const loadLiveStats = useCallback(async () => {
    if (!selectedMatchId) return;
    try {
      const res = await api.fetchLiveStats(selectedMatchId);
      setLiveStats(res.data);
    } catch (err) {
      console.error("loadLiveStats error:", err);
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!selectedMatchId) return;
    // Reset stale data from previous match immediately
    setMatch(null);
    setEvents([]);
    setTickerTexts([]);
    setPrematch([]);
    setLiveStats([]);
    setLineups([]);
    setMatchStats([]);
    setPlayerStats([]);
    setLoading(true);

    Promise.all([
      loadMatch(),
      loadEvents(),
      loadTickerTexts(),
      loadPrematch(),
      loadLiveStats(),
      loadLineups(),
      loadMatchStats(),
      loadPlayerStats(),
    ]).finally(() => setLoading(false));

    const t1 = setTimeout(() => {
      loadLineups();
      loadMatchStats();
      loadPlayerStats();
      loadPrematch();
    }, 5000);
    const t2 = setTimeout(() => {
      loadLineups();
      loadMatchStats();
      loadPlayerStats();
      loadPrematch();
    }, 15000);

    intervalRef.current = setInterval(() => {
      loadEvents();
      loadTickerTexts();
      loadLiveStats();
    }, 5000);

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
    liveStats,
    lineups,
    matchStats,
    playerStats,
    loading,
    reload: { loadEvents, loadTickerTexts, loadPrematch, loadLiveStats, loadLineups, loadMatchStats },
  };
}
