import { useState, useEffect, useCallback, useRef } from "react";
import type React from "react";
import * as api from "../api";
import logger from "../utils/logger";
import { POLL_EVENTS_MS, POLL_MATCH_REFRESH_MS } from "../components/LiveTicker/constants";
import { resolvePollingInterval } from "../utils/resolvePollingInterval";

/**
 * Lädt und pollt match-bezogene Kerndaten:
 * Match-Objekt, Spieler, Aufstellung, Statistiken, Prematch, Verletzungen.
 *
 * @param {number|null} selectedMatchId
 */
import type { Match, Player, LineupEntry, PlayerStat, MatchStat, TickerEntry, InjuryGroup } from "../types";

export function useMatchCore(selectedMatchId: number | null) {
  const [match, setMatch] = useState<Match | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [prematch, setPrematch] = useState<TickerEntry[]>([]);
  const [lineups, setLineups] = useState<LineupEntry[]>([]);
  const [matchStats, setMatchStats] = useState<MatchStat[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStat[]>([]);
  const [injuries, setInjuries] = useState<InjuryGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const matchRef = useRef<Match | null>(null);

  const _load = useCallback(async <T>(
    fetchFn: (id: number) => Promise<{ data: T }>,
    setFn: React.Dispatch<React.SetStateAction<T>>,
    transform?: (d: T) => T,
  ) => {
    if (!selectedMatchId) return;
    try {
      const res = await fetchFn(selectedMatchId);
      setFn(transform ? transform(res.data) : res.data);
    } catch (err) {
      logger.error(`[useMatchCore] ${fetchFn.name} failed:`, err);
    }
  }, [selectedMatchId]);

  const loadMatch = useCallback(async () => {
    if (!selectedMatchId) return;
    try {
      const res = await api.fetchMatch(selectedMatchId);
      matchRef.current = res.data;
      setMatch(res.data);
    } catch (err) {
      logger.error("[useMatchCore] fetchMatch failed:", err);
    }
  }, [selectedMatchId]);

  const loadPlayers = useCallback(async () => {
    const m = matchRef.current;
    const teamIds = [m?.teamHomeId, m?.teamAwayId].filter(Boolean);
    if (!teamIds.length) return;
    try {
      const results = await Promise.all(teamIds.map((id) => api.fetchPlayers(id)));
      setPlayers(results.flatMap((r) => r.data?.items ?? []));
    } catch (err) {
      logger.error("[useMatchCore] loadPlayers error:", err);
    }
  }, []);

  const loadPrematch    = useCallback(() => _load(api.fetchPrematch,    setPrematch),    [_load]);
  const loadLineups     = useCallback(() => _load(api.fetchLineups,     setLineups),     [_load]);
  const loadMatchStats  = useCallback(() => _load(api.fetchMatchStats,  setMatchStats),  [_load]);
  const loadPlayerStats = useCallback(() => _load(api.fetchPlayerStats, setPlayerStats), [_load]);
  const loadInjuries    = useCallback(() => _load(api.fetchInjuries,    setInjuries, (d) => d ?? []), [_load]);

  // Initial load + Frühzeitige Nachlade-Timeouts
  useEffect(() => {
    if (!selectedMatchId) return;
    matchRef.current = null;
    setMatch(null); setPlayers([]); setPrematch([]); setLineups([]);
    setMatchStats([]); setPlayerStats([]); setInjuries([]);
    setLoading(true);

    const matchAndPlayers = loadMatch().then(() => loadPlayers());
    Promise.all([
      matchAndPlayers,
      loadPrematch(),
      loadLineups(),
      loadMatchStats(),
      loadPlayerStats(),
      loadInjuries(),
    ]).finally(() => setLoading(false));

    const reload = () => {
      loadLineups();
      loadMatchStats();
      loadMatch().then(() => loadPlayers());
      loadPrematch();
    };
    const t1 = setTimeout(reload, POLL_EVENTS_MS);
    const t2 = setTimeout(reload, POLL_MATCH_REFRESH_MS);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMatchId]);

  // Polling: match, matchStats, injuries (Interval abhängig von matchState)
  useEffect(() => {
    if (!selectedMatchId) return;
    const id = setInterval(() => {
      loadMatch();
      loadMatchStats();
      loadInjuries();
    }, resolvePollingInterval(match?.matchState));
    return () => clearInterval(id);
  }, [selectedMatchId, match?.matchState, loadMatch, loadMatchStats, loadInjuries]);

  return {
    match,
    players,
    prematch,
    lineups,
    matchStats,
    playerStats,
    injuries,
    loading,
    reload: {
      loadMatch,
      loadPlayers,
      loadPrematch,
      loadLineups,
      loadMatchStats,
      loadPlayerStats,
      loadInjuries,
    },
  };
}
