import { useState, useRef } from "react";
import { TICKER_STYLES, STYLE_META } from "../constants";
import type { TickerStyle } from "../../../types";
import { useClickOutside } from "hooks/useClickOutside";

export function StylePickerDropdown({
  onSelect,
  disabled,
}: {
  onSelect: (style: TickerStyle) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));

  return (
    <div style={{ position: "relative" }} ref={ref}>
      <button
        className={`lt-btn lt-btn--ghost lt-style-picker__trigger${open ? " lt-style-picker__trigger--open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
      >
        ✦ KI-Stil
        <svg
          width="8"
          height="8"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          style={{
            transition: "transform 0.15s",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="lt-style-picker__menu">
          <div className="lt-style-picker__hint">Schreibstil wählen</div>
          {TICKER_STYLES.map((s) => {
            const meta = STYLE_META[s] ?? { emoji: "✦", label: s };
            return (
              <button
                key={s}
                className="lt-style-picker__item"
                onClick={() => {
                  onSelect(s);
                  setOpen(false);
                }}
              >
                <span className="lt-style-picker__emoji">{meta.emoji}</span>
                <span className="lt-style-picker__label">{meta.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
