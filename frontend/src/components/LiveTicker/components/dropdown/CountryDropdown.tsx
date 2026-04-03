import React from "react";
import { useSearchableDropdown } from "../../../../hooks/useSearchableDropdown";
import { DropdownList } from "./DropdownList";
import { DROPDOWN_INPUT_STYLE } from "./dropdownStyles";

interface CountryDropdownProps {
  countries: string[];
  value: string | null;
  onSelect: (c: string | null) => void;
  focusRef?: React.RefObject<HTMLInputElement>;
}

export function CountryDropdown({
  countries,
  value,
  onSelect,
  focusRef,
}: CountryDropdownProps) {
  const {
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
  } = useSearchableDropdown({
    items: countries,
    onSelect,
    getLabel: (c) => c,
    getValue: (c) => c,
  });

  // Merge external focusRef with internal inputRef so callers can imperatively focus
  const mergedRef = (el: HTMLInputElement | null) => {
    (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
    if (focusRef) (focusRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
  };

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onSelect(null);
    setQuery("");
    inputRef.current?.focus();
  }
  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    // Schließen wenn Fokus das gesamte Dropdown verlässt (z.B. Tab)
    if (!ref.current?.contains(e.relatedTarget as Node)) {
      handleClose();
    }
  }

  return (
    <div
      className="lt-start__select-wrap"
      ref={ref}
      style={{ position: "relative" }}
    >
      <label className="lt-start__label">Land</label>
      <div style={{ position: "relative" }}>
        <input
          ref={mergedRef}
          value={open ? query : (value ?? "")}
          placeholder="Land auswählen"
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleOpen}
          onBlur={handleBlur}
          onKeyDown={open ? handleKeyDown : undefined}
          style={{
            ...DROPDOWN_INPUT_STYLE,
            borderColor: open ? "var(--lt-accent)" : "var(--lt-border)",
          }}
        />
        {value && !open ? (
          <button
            onMouseDown={handleClear}
            style={{
              position: "absolute",
              right: 6,
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              color: "var(--lt-text-muted)",
              cursor: "pointer",
              fontSize: "1rem",
              lineHeight: 1,
              padding: 2,
            }}
            title="Auswahl zurücksetzen"
          >
            ×
          </button>
        ) : (
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: `translateY(-50%) rotate(${open ? 180 : 0}deg)`,
              transition: "transform 0.15s",
              pointerEvents: "none",
              color: "var(--lt-text-muted)",
            }}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        )}
      </div>
      {open && (
        <DropdownList
          filtered={filtered}
          value={value}
          total={countries.length}
          unit="Länder"
          onSelect={handleSelect}
          activeIdx={activeIdx}
        />
      )}
    </div>
  );
}
