import { useEffect, useRef, useState, useCallback } from "react";

const THRESHOLD = 72;
const RESISTANCE = 0.4;

export function usePullToRefresh(
  onRefresh: () => Promise<void>,
  enabled: boolean,
) {
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Refs — stabile Werte ohne Effect-Neuregistrierung bei jedem Render
  const startYRef = useRef<number | null>(null);
  const pullYRef = useRef(0);
  const refreshingRef = useRef(false);
  const enabledRef = useRef(enabled);

  useEffect(() => { enabledRef.current = enabled; }, [enabled]);

  const doRefresh = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setRefreshing(true);
    setPullY(0);
    pullYRef.current = 0;
    try {
      await onRefresh();
    } finally {
      refreshingRef.current = false;
      setRefreshing(false);
    }
  }, [onRefresh]);

  const doRefreshRef = useRef(doRefresh);
  useEffect(() => { doRefreshRef.current = doRefresh; }, [doRefresh]);

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      if (!enabledRef.current || refreshingRef.current) return;
      if (window.scrollY > 0) return;
      startYRef.current = e.touches[0].clientY;
    }

    function onTouchMove(e: TouchEvent) {
      if (startYRef.current === null) return;
      const delta = (e.touches[0].clientY - startYRef.current) * RESISTANCE;
      if (delta <= 0) { startYRef.current = null; return; }
      const clamped = Math.min(delta, THRESHOLD * 1.5);
      pullYRef.current = clamped;
      setPullY(clamped);
      if (delta > THRESHOLD / RESISTANCE) e.preventDefault();
    }

    function onTouchEnd() {
      if (startYRef.current === null) return;
      startYRef.current = null;
      const y = pullYRef.current;
      pullYRef.current = 0;
      if (y >= THRESHOLD) {
        doRefreshRef.current();
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
  }, []); // leeres Array — Listener werden nur einmal registriert

  return { pullY, refreshing };
}
