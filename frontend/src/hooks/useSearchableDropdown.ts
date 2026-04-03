// ============================================================
// useSearchableDropdown.js
// ============================================================
// Custom hook that encapsulates the shared state and logic for
// both CountryDropdown and Dropdown in StartScreen.jsx.
//
// Params:
//   items      – raw item array
//   onSelect   – callback(val) when an item is selected
//   getLabel   – (item) => string  used for filtering
//   getValue   – (item) => T       the value passed to onSelect (defaults to item)
//   disabled   – if true, handleOpen is a no-op
//
// Returns:
//   open, query, setQuery, filtered, activeIdx, ref, inputRef,
//   handleOpen, handleSelect, handleClose, handleKeyDown
// ============================================================

import { useState, useRef, useMemo, useCallback } from "react";
import { useClickOutside } from "hooks/useClickOutside";
import { useListKeyboard } from "hooks/useListKeyboard";

/**
 * @param {{
 *   items: Array,
 *   onSelect: Function,
 *   getLabel: (item: unknown) => string,
 *   getValue?: (item: unknown) => unknown,
 *   disabled?: boolean
 * }} params
 */
export function useSearchableDropdown({
  items,
  onSelect,
  getLabel,
  getValue = (item) => item,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);
  const inputRef = useRef(null);

  const closeAndClear = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  useClickOutside(ref, closeAndClear);

  // Each filtered entry has the shape { key, label, val } that DropdownList expects.
  const filtered = useMemo(
    () =>
      items
        .filter((item) =>
          getLabel(item).toLowerCase().includes(query.toLowerCase()),
        )
        .map((item) => ({
          key: String(getValue(item)),
          label: getLabel(item),
          val: getValue(item),
        })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, query],
  );

  const handleSelect = useCallback(
    (val) => {
      onSelect(val);
      setOpen(false);
      setQuery("");
      inputRef.current?.blur();
    },
    [onSelect],
  );

  const handleClose = useCallback(() => {
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
  }, []);

  const filteredVals = useMemo(() => filtered.map((f) => f.val), [filtered]);
  const { activeIdx, onKeyDown: handleKeyDown } = useListKeyboard(
    filteredVals,
    {
      onSelect: handleSelect,
      onClose: handleClose,
    },
  );

  const handleOpen = useCallback(() => {
    if (!disabled) {
      setOpen(true);
      setQuery("");
    }
  }, [disabled]);

  return {
    open,
    query,
    setQuery,
    filtered,
    activeIdx,
    ref,
    inputRef,
    handleOpen,
    handleSelect,
    handleClose,
    handleKeyDown,
  };
}
