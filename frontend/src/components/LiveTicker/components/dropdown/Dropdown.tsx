import { useState, useMemo, useCallback } from "react";
import { useClickOutside } from "hooks/useClickOutside";
import { useListKeyboard } from "hooks/useListKeyboard";
import { DropdownList } from "./DropdownList";
import { DROPDOWN_INPUT_STYLE } from "./dropdownStyles";
import { useRef } from "react";

interface DropdownItem {
  value: number | string;
  label: string;
  desc?: string;
}

interface DropdownProps {
  label: string;
  disabled?: boolean;
  value: number | string | null;
  placeholder?: string;
  displayValue?: string;
  items: DropdownItem[];
  onSelect: (val: number | string) => void;
}

export function Dropdown({
  label,
  disabled,
  value,
  placeholder,
  displayValue,
  items,
  onSelect,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useClickOutside(ref, () => {
    setOpen(false);
    setQuery("");
  });

  const filtered = useMemo(
    () =>
      items
        .filter((item) =>
          item.label.toLowerCase().includes(query.toLowerCase()),
        )
        .map((item) => ({
          key: item.value,
          label: item.label,
          desc: item.desc,
          val: item.value,
        })),
    [items, query],
  );

  const handleSelect = useCallback(
    (val: number | string) => {
      onSelect(val);
      setOpen(false);
      setQuery("");
      // Nach Auswahl: Fokus aufs nächste nicht-disabled Input im selben Container
      requestAnimationFrame(() => {
        const el = ref.current;
        const inputEl = inputRef.current;
        const parent =
          el?.closest(".lt-start__selects") ?? el?.parentElement?.parentElement;
        if (!parent || !inputEl) return;
        const inputs = Array.from(
          parent.querySelectorAll("input:not([disabled])"),
        ) as HTMLInputElement[];
        const idx = inputs.indexOf(inputEl);
        if (idx >= 0 && idx + 1 < inputs.length) inputs[idx + 1].focus();
      });
    },
    [onSelect],
  );

  const handleClose = useCallback(() => {
    setOpen(false);
    setQuery("");
    // kein blur() — Fokus bleibt, damit Tab natürlich zum nächsten Feld springt
  }, []);

  const filteredVals = useMemo(() => filtered.map((f) => f.val), [filtered]);
  const { activeIdx, onKeyDown } = useListKeyboard(filteredVals, {
    onSelect: handleSelect,
    onClose: handleClose,
  });

  function handleFocus() {
    if (!disabled) {
      setOpen(true);
      setQuery("");
    }
  }
  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    // relatedTarget statt setTimeout — verhindert Race mit dem nächsten Dropdown
    if (!ref.current?.contains(e.relatedTarget as Node)) {
      setOpen(false);
      setQuery("");
    }
  }

  return (
    <div
      className="lt-start__select-wrap"
      ref={ref}
      style={{ position: "relative" }}
    >
      <label className="lt-start__label">{label}</label>
      <div style={{ position: "relative" }}>
        <input
          ref={inputRef}
          value={open ? query : (displayValue ?? "")}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={open ? onKeyDown : undefined}
          style={{
            ...DROPDOWN_INPUT_STYLE,
            borderColor: open ? "var(--lt-accent)" : "var(--lt-border)",
            opacity: disabled ? 0.45 : 1,
            cursor: disabled ? "not-allowed" : "text",
          }}
        />
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
      </div>
      {open && (
        <DropdownList
          filtered={filtered}
          value={value}
          total={items.length}
          unit="Einträge"
          onSelect={handleSelect}
          activeIdx={activeIdx}
        />
      )}
    </div>
  );
}
