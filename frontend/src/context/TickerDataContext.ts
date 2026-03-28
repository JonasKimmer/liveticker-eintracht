/**
 * TickerDataContext
 * =================
 * Stellt Match-Daten (match, events, tickerTexts, reload) tief im
 * Komponentenbaum bereit, ohne sie durch 3-4 Ebenen per Props zu leiten.
 *
 * Trennung von TickerModeContext (Modus-State + Shortcuts) und
 * TickerActionsContext (Callbacks wie publish, delete, generate).
 */

import { createContext, useContext } from "react";
import type { Match, MatchEvent, TickerEntry, ReloadFunctions } from "../types";

export interface TickerDataContextValue {
  match: Match | null;
  events: MatchEvent[];
  tickerTexts: TickerEntry[];
  prematch: TickerEntry[];
  lineups: unknown;
  matchStats: unknown;
  players: unknown[];
  playerStats: unknown[];
  injuries: unknown;
  reload: ReloadFunctions;
  generatingId: number | null;
}

export const TickerDataContext = createContext<TickerDataContextValue | null>(null);

/**
 * Hook zum Konsumieren des TickerDataContext.
 * Wirft einen klaren Fehler wenn außerhalb des Providers verwendet.
 */
export function useTickerDataContext(): TickerDataContextValue {
  const ctx = useContext(TickerDataContext);
  if (!ctx) throw new Error("useTickerDataContext must be used within TickerDataContext.Provider");
  return ctx;
}
