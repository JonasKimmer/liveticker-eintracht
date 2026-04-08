import { useState, useRef, useCallback } from "react";
import { useClickOutside } from "hooks/useClickOutside";
import type { TickerMode } from "../../../../types";

const MODE_OPTIONS: {
  value: TickerMode;
  icon: string;
  label: string;
  desc: string;
}[] = [
  {
    value: "auto",
    icon: "⚡",
    label: "Auto",
    desc: "KI generiert und veröffentlicht vollautomatisch.",
  },
  {
    value: "coop",
    icon: "🤝",
    label: "Co-Op",
    desc: "KI erstellt Entwürfe — du prüfst und veröffentlichst per TAB.",
  },
  {
    value: "manual",
    icon: "✍️",
    label: "Manuell",
    desc: "Du schreibst alle Ticker-Einträge selbst.",
  },
];

interface TickerModeSelectorProps {
  value: TickerMode;
  onChange: (mode: TickerMode) => void;
}

export function TickerModeSelector({
  value,
  onChange,
}: TickerModeSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));

  const active = MODE_OPTIONS.find((o) => o.value === value)!;

  const handleSelect = useCallback(
    (mode: TickerMode) => {
      onChange(mode);
      setOpen(false);
    },
    [onChange],
  );

  return (
    <div
      className="lt-start__select-wrap"
      ref={ref}
      style={{ position: "relative" }}
    >
      <label className="lt-start__label">Ticker-Modus</label>
      <button
        type="button"
        className="lt-mode-sel__trigger"
        onClick={() => setOpen((v) => !v)}
        style={{ borderColor: open ? "var(--lt-accent)" : undefined }}
      >
        <span>
          {active.icon} {active.label}
        </span>
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{
            transform: `rotate(${open ? 180 : 0}deg)`,
            transition: "transform 0.15s",
            color: "var(--lt-text-muted)",
          }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="lt-mode-sel__list">
          {MODE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`lt-mode-sel__option${opt.value === value ? " lt-mode-sel__option--active" : ""}`}
              onClick={() => handleSelect(opt.value)}
            >
              <span className="lt-mode-sel__option-head">
                {opt.icon} {opt.label}
              </span>
              <span className="lt-mode-sel__option-desc">{opt.desc}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
