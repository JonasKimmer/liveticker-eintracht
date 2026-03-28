import { useState, useEffect, useCallback } from "react";
import * as api from "../api";
import logger from "../utils/logger";
import { POLL_EVENTS_MS, POLL_MATCH_REFRESH_MS } from "../components/LiveTicker/constants";
import { resolvePollingInterval } from "../utils/resolvePollingInterval";

/**
 * Lädt und pollt Match-Events (Tore, Karten, Wechsel …).
 *
 * @param {number|null} selectedMatchId
 * @param {string|null} matchState - aus useMatchCore, steuert Polling-Intervall
 */
export function useMatchEvents(selectedMatchId, matchState) {
  const [events, setEvents] = useState([]);

  const loadEvents = useCallback(async () => {
    if (!selectedMatchId) return;
    try {
      const res = await api.fetchEvents(selectedMatchId);
      setEvents([...(res.data?.items ?? res.data ?? [])].reverse());
    } catch (err) {
      logger.error("[useMatchEvents] fetchEvents failed:", err);
    }
  }, [selectedMatchId]);

  // Initial load + frühzeitige Nachlade-Timeouts
  useEffect(() => {
    if (!selectedMatchId) return;
    setEvents([]);
    loadEvents();
    const t1 = setTimeout(loadEvents, POLL_EVENTS_MS);
    const t2 = setTimeout(loadEvents, POLL_MATCH_REFRESH_MS);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMatchId]);

  // Polling: Intervall abhängig von matchState
  useEffect(() => {
    if (!selectedMatchId) return;
    const id = setInterval(loadEvents, resolvePollingInterval(matchState));
    return () => clearInterval(id);
  }, [selectedMatchId, matchState, loadEvents]);

  return { events, reload: { loadEvents } };
}
