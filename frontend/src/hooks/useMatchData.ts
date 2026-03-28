import { useMatchCore } from "./useMatchCore";
import { useMatchEvents } from "./useMatchEvents";
import { useMatchTicker } from "./useMatchTicker";

/**
 * Aggregiert alle Match-Daten aus den drei Teilhooks.
 * Öffentliche API bleibt identisch zur bisherigen Version.
 *
 * @param {number|null} selectedMatchId
 */
export function useMatchData(selectedMatchId: number | null) {
  const core = useMatchCore(selectedMatchId);
  const { events, reload: evReload } = useMatchEvents(selectedMatchId, core.match?.matchState);
  const { tickerTexts, reload: txReload } = useMatchTicker(selectedMatchId, core.match?.matchState);

  return {
    match:       core.match,
    players:     core.players,
    prematch:    core.prematch,
    lineups:     core.lineups,
    matchStats:  core.matchStats,
    playerStats: core.playerStats,
    injuries:    core.injuries,
    loading:     core.loading,
    events,
    tickerTexts,
    reload: { ...core.reload, ...evReload, ...txReload },
  };
}
