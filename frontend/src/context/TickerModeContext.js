import { createContext, useContext } from "react";

/**
 * Stellt { mode, setMode, acceptDraft, rejectDraft } für alle Panels bereit.
 * Wird in LiveTicker.jsx via TickerModeContext.Provider bereitgestellt.
 * Consumption via useTickerModeContext() — kein prop-drilling über >2 Ebenen.
 */
export const TickerModeContext = createContext(null);

export function useTickerModeContext() {
  const ctx = useContext(TickerModeContext);
  if (!ctx)
    throw new Error(
      "useTickerModeContext muss innerhalb von <TickerModeContext.Provider> verwendet werden",
    );
  return ctx;
}
