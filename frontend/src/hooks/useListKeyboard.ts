import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Keyboard-Navigation für Listen (Dropdowns, Suggestions, Match-Listen).
 *
 * @param {Array} items  – Die Werte der Liste (z.B. IDs oder Strings)
 * @param {{ onSelect: (item) => void, onClose: () => void }} callbacks
 * @returns {{ activeIdx: number, setActiveIdx: Function, onKeyDown: Function }}
 *
 * Tasten: ArrowDown / ArrowUp navigieren, Enter wählt aus, Escape schließt.
 */
export function useListKeyboard<T>(
  items: T[],
  {
    onSelect,
    onClose,
  }: { onSelect?: (item: T) => void; onClose?: () => void } = {},
) {
  const [activeIdx, setActiveIdx] = useState(0);

  // Index zurücksetzen wenn sich die Liste ändert (z.B. durch Suche)
  useEffect(() => setActiveIdx(0), [items]);

  // Refs damit der Callback stabil bleibt und trotzdem aktuelle Werte liest
  const itemsRef = useRef(items);
  const activeIdxRef = useRef(activeIdx);
  const onSelectRef = useRef(onSelect);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  useEffect(() => {
    activeIdxRef.current = activeIdx;
  }, [activeIdx]);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const onKeyDown = useCallback((e) => {
    const its = itemsRef.current;
    if (!its.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, its.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = its[activeIdxRef.current];
      if (item !== undefined) onSelectRef.current?.(item);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCloseRef.current?.();
    } else if (e.key === "Tab") {
      // Tab schließt dropdown, lässt aber den natürlichen Fokus-Wechsel zu
      onCloseRef.current?.();
    }
  }, []); // stabil – liest immer aktuelle Werte via Refs

  return { activeIdx, setActiveIdx, onKeyDown };
}
