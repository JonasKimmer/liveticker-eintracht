import { createContext, useContext } from "react";
import type { TickerMode } from "../types";

export interface TickerModeContextValue {
  mode: TickerMode;
  setMode: (mode: TickerMode) => void;
  acceptDraft: () => Promise<void>;
  rejectDraft: () => Promise<void>;
}

/**
 * Stellt { mode, setMode, acceptDraft, rejectDraft } für alle Panels bereit.
 * Wird in LiveTicker.jsx via TickerModeContext.Provider bereitgestellt.
 * Consumption via useTickerModeContext() — kein prop-drilling über >2 Ebenen.
 */
export const TickerModeContext = createContext<TickerModeContextValue | null>(null);

export function useTickerModeContext(): TickerModeContextValue {
  const ctx = useContext(TickerModeContext);
  if (!ctx)
    throw new Error(
      "useTickerModeContext muss innerhalb von <TickerModeContext.Provider> verwendet werden",
    );
  return ctx;
}
