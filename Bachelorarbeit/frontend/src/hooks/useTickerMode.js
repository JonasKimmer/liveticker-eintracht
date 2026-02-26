import { useState, useEffect, useCallback } from "react";
import { MODES } from "../components/LiveTicker/constants";

/**
 * Kapselt die gesamte Modus-Logik:
 *  - mode state
 *  - setMode
 *  - acceptDraft / rejectDraft Callbacks
 *  - Keyboard-Shortcuts (TAB / ESC) — nur aktiv im CO-OP Modus
 *
 * Gibt { mode, setMode, acceptDraft, rejectDraft } zurück.
 * Wird in LiveTicker.jsx konsumiert und via TickerModeContext nach unten gereicht.
 *
 * @param {Function} onAccept - Wird aufgerufen wenn Draft akzeptiert wird
 * @param {Function} onReject - Wird aufgerufen wenn Draft abgelehnt wird
 */
export function useTickerMode(onAccept, onReject) {
  const [mode, setMode] = useState(MODES.AUTO);

  const acceptDraft = useCallback(() => {
    if (typeof onAccept === "function") onAccept();
  }, [onAccept]);

  const rejectDraft = useCallback(() => {
    if (typeof onReject === "function") onReject();
  }, [onReject]);

  // Keyboard-Shortcuts: nur im CO-OP Modus aktiv
  useEffect(() => {
    if (mode !== MODES.COOP) return;

    const handler = (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        acceptDraft();
      }
      if (e.key === "Escape") {
        rejectDraft();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mode, acceptDraft, rejectDraft]);

  // Alt+1/2/3 — Modus per Tastatur wechseln (alle Modi)
  useEffect(() => {
    const handler = (e) => {
      if (!e.altKey) return;
      if (e.key === "1") setMode(MODES.AUTO);
      if (e.key === "2") setMode(MODES.COOP);
      if (e.key === "3") setMode(MODES.MANUAL);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return { mode, setMode, acceptDraft, rejectDraft };
}
