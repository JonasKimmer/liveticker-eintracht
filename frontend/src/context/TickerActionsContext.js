/**
 * TickerActionsContext
 * ====================
 * Stellt Ticker-Callbacks (generate, publish, edit, delete) tief im
 * Komponentenbaum bereit, ohne massives Prop Drilling in LiveTicker.jsx.
 *
 * Trennung von TickerDataContext (reine Daten) ermöglicht selektive
 * Re-Renders: Komponenten die nur Actions brauchen, rendern nicht neu
 * wenn sich match oder tickerTexts ändern.
 */

import { createContext, useContext } from "react";

export const TickerActionsContext = createContext(null);

/**
 * Hook zum Konsumieren des TickerActionsContext.
 * Wirft einen klaren Fehler wenn außerhalb des Providers verwendet.
 */
export function useTickerActionsContext() {
  const ctx = useContext(TickerActionsContext);
  if (!ctx) throw new Error("useTickerActionsContext must be used within TickerActionsContext.Provider");
  return ctx;
}
