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
    desc: "KI generiert und veröffentlicht vollautomatisch",
  },
  {
    value: "coop",
    icon: "🤝",
    label: "Co-Op",
    desc: "KI erstellt Entwürfe, du prüfst und veröffentlichst",
  },
  {
    value: "manual",
    icon: "✍️",
    label: "Manuell",
    desc: "Du schreibst alle Einträge selbst",
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
  return (
    <div className="lt-mode-sel">
      <label className="lt-start__label">Ticker-Modus</label>
      <div className="lt-mode-sel__cards">
        {MODE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`lt-mode-sel__card${value === opt.value ? " lt-mode-sel__card--active" : ""}`}
            onClick={() => onChange(opt.value)}
            type="button"
          >
            <span className="lt-mode-sel__icon">{opt.icon}</span>
            <span className="lt-mode-sel__label">{opt.label}</span>
            <span className="lt-mode-sel__desc">{opt.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
