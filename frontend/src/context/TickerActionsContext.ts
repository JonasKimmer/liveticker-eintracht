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
import type { TickerStyle, MatchPhase } from "../types";

export interface TickerActionsContextValue {
  onGenerate: (eventId: number, style: TickerStyle) => Promise<void>;
  onManualPublish: (
    text: string,
    icon?: string,
    minute?: number | null,
    phase?: MatchPhase | null,
    rawInput?: string,
  ) => Promise<void>;
  onDraftActive: (id: number, text: string) => void;
  onPublished: (id: number, text: string, isManual?: boolean) => void;
  onEditEntry: (id: number, text: string) => Promise<void>;
  onDeleteEntry: (id: number) => Promise<void>;
  retractedText: string | null;
  clearRetractedText: () => void;
}

export const TickerActionsContext =
  createContext<TickerActionsContextValue | null>(null);

/**
 * Hook zum Konsumieren des TickerActionsContext.
 * Wirft einen klaren Fehler wenn außerhalb des Providers verwendet.
 */
export function useTickerActionsContext(): TickerActionsContextValue {
  const ctx = useContext(TickerActionsContext);
  if (!ctx)
    throw new Error(
      "useTickerActionsContext must be used within TickerActionsContext.Provider",
    );
  return ctx;
}
