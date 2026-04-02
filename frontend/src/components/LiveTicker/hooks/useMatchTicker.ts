import { useState, useEffect, useCallback } from "react";
import type { TickerEntry } from "../../../types";
import * as api from "api";
import logger from "utils/logger";
import { POLL_EVENTS_MS, POLL_MATCH_REFRESH_MS } from "../constants";
import { resolvePollingInterval } from "utils/resolvePollingInterval";

/**
 * Lädt und pollt Ticker-Texte (Drafts + veröffentlichte Einträge).
 *
 * @param {number|null} selectedMatchId
 * @param {string|null} matchState - aus useMatchCore, steuert Polling-Intervall
 */
export function useMatchTicker(
  selectedMatchId: number | null,
  matchState: string | null,
) {
  const [tickerTexts, setTickerTexts] = useState<TickerEntry[]>([]);

  const loadTickerTexts = useCallback(async () => {
    if (!selectedMatchId) return;
    try {
      const res = await api.fetchTickerTexts(selectedMatchId);
      setTickerTexts(res.data);
    } catch (err) {
      logger.error("[useMatchTicker] fetchTickerTexts failed:", err);
    }
  }, [selectedMatchId]);

  // Initial load + frühzeitige Nachlade-Timeouts
  // (tickerTexts: n8n generiert Drafts kurz nach Match-Load → nach 5 s nochmal laden)
  useEffect(() => {
    if (!selectedMatchId) return;
    setTickerTexts([]);
    loadTickerTexts();
    const t1 = setTimeout(loadTickerTexts, POLL_EVENTS_MS);
    const t2 = setTimeout(loadTickerTexts, POLL_MATCH_REFRESH_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMatchId]);

  // Polling: Intervall abhängig von matchState
  useEffect(() => {
    if (!selectedMatchId) return;
    const id = setInterval(loadTickerTexts, resolvePollingInterval(matchState));
    return () => clearInterval(id);
  }, [selectedMatchId, matchState, loadTickerTexts]);

  return { tickerTexts, reload: { loadTickerTexts } };
}
