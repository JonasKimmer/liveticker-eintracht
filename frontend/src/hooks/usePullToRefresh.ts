import { useEffect, useRef, useState, useCallback } from "react";

const THRESHOLD = 72; // px nach unten ziehen bis Refresh auslöst
const RESISTANCE = 0.4; // wie stark der Pull gedämpft wird

/**
 * Pull-to-Refresh auf Touch-Geräten.
 * Gibt { pullY, refreshing } zurück; onRefresh wird nach Schwellwert aufgerufen.
 *
 * @param onRefresh  Async-Funktion die alle Daten neu lädt
 * @param enabled    Nur aktiv wenn true (= Spiel ausgewählt)
 */
export function usePullToRefresh(
  onRefresh: () => Promise<void>,
  enabled: boolean,
) {
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef<number | null>(null);
  const pullingRef = useRef(false);

  const doRefresh = useCallback(async () => {
    setRefreshing(true);
    setPullY(0);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  useEffect(() => {
    if (!enabled) return;

    function onTouchStart(e: TouchEvent) {
      // Nur auslösen wenn ganz oben
      if (window.scrollY > 0) return;
      startYRef.current = e.touches[0].clientY;
      pullingRef.current = false;
    }

    function onTouchMove(e: TouchEvent) {
      if (startYRef.current === null) return;
      const delta = (e.touches[0].clientY - startYRef.current) * RESISTANCE;
      if (delta <= 0) { startYRef.current = null; return; }
      pullingRef.current = true;
      setPullY(Math.min(delta, THRESHOLD * 1.5));
      if (delta > THRESHOLD / RESISTANCE) e.preventDefault();
    }

    function onTouchEnd() {
      if (!pullingRef.current) return;
      const current = pullY;
      startYRef.current = null;
      pullingRef.current = false;
      if (current >= THRESHOLD) {
        doRefresh();
      } else {
        setPullY(0);
      }
    }

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [enabled, doRefresh, pullY]);

  return { pullY, refreshing };
}
