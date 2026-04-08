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
  const active = MODE_OPTIONS.find((o) => o.value === value)!;
  return (
    <div className="lt-mode-sel">
      <label className="lt-start__label">Ticker-Modus</label>
      <div className="lt-mode-sel__track">
        {MODE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`lt-mode-sel__seg${value === opt.value ? " lt-mode-sel__seg--active" : ""}`}
            onClick={() => onChange(opt.value)}
            type="button"
          >
            <span className="lt-mode-sel__seg-icon">{opt.icon}</span>
            {opt.label}
          </button>
        ))}
      </div>
      <p className="lt-mode-sel__hint">{active.desc}</p>
    </div>
  );
}
