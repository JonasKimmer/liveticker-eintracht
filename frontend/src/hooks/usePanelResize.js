/**
 * usePanelResize
 * ==============
 * Manages drag-to-resize for two panels (center + right).
 * - center: resizes by dragging its right edge (delta adds to width)
 * - right:  resizes by dragging its left edge  (delta subtracts from width)
 *
 * Used by: LiveTicker.jsx
 */
import { useState, useRef, useCallback, useEffect } from "react";

export function usePanelResize({
  rightInitial = 380,
  rightMin = 280,
  rightMax = 700,
  centerInitial = 320,
  centerMin = 240,
  centerMax = 600,
} = {}) {
  const [rightW, setRightW] = useState(rightInitial);
  const [centerW, setCenterW] = useState(centerInitial);

  const draggingPanel = useRef(null);
  const dragStartX = useRef(0);
  const dragStartW = useRef(0);

  // Capture limits in refs so the mousemove handler never goes stale
  const limitsRef = useRef({ rightMin, rightMax, centerMin, centerMax });
  useEffect(() => {
    limitsRef.current = { rightMin, rightMax, centerMin, centerMax };
  }, [rightMin, rightMax, centerMin, centerMax]);

  const handleResizeMouseDown = useCallback((e) => {
    draggingPanel.current = "right";
    dragStartX.current = e.clientX;
    dragStartW.current = rightW;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [rightW]);

  const handleCenterResizeMouseDown = useCallback((e) => {
    draggingPanel.current = "center";
    dragStartX.current = e.clientX;
    dragStartW.current = centerW;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [centerW]);

  useEffect(() => {
    const onMove = (e) => {
      if (!draggingPanel.current) return;
      const { rightMin, rightMax, centerMin, centerMax } = limitsRef.current;
      const delta = e.clientX - dragStartX.current;
      if (draggingPanel.current === "right") {
        setRightW(Math.min(rightMax, Math.max(rightMin, dragStartW.current - delta)));
      } else {
        setCenterW(Math.min(centerMax, Math.max(centerMin, dragStartW.current + delta)));
      }
    };
    const onUp = () => {
      if (!draggingPanel.current) return;
      draggingPanel.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  return { rightW, centerW, handleResizeMouseDown, handleCenterResizeMouseDown };
}
