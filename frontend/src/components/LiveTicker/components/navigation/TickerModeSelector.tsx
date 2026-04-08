import { useState } from "react";
import type { TickerMode } from "../../../../types";

const MODE_OPTIONS: { value: TickerMode; label: string; desc: string }[] = [
  {
    value: "auto",
    label: "Auto",
    desc: "KI generiert und veröffentlicht Ticker-Einträge vollautomatisch.",
  },
  {
    value: "coop",
    label: "Co-Op",
    desc: "KI erstellt Entwürfe, du prüfst und veröffentlichst per Klick oder TAB.",
  },
  {
    value: "manual",
    label: "Manuell",
    desc: "Du schreibst alle Ticker-Einträge selbst. Keine KI-Generierung.",
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
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="lt-mode-sel">
      <div className="lt-mode-sel__header">
        <label className="lt-start__label">Ticker-Modus</label>
        <button
          className="lt-mode-sel__info-btn"
          onClick={() => setShowInfo((v) => !v)}
          title="Modus-Beschreibungen anzeigen"
          type="button"
        >
          ⓘ
        </button>
      </div>
      <div className="lt-mode-sel__group">
        {MODE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`lt-mode-sel__btn${value === opt.value ? " lt-mode-sel__btn--active" : ""}`}
            onClick={() => onChange(opt.value)}
            type="button"
          >
            {opt.label}
          </button>
        ))}
      </div>
      {showInfo && (
        <div className="lt-mode-sel__descs">
          {MODE_OPTIONS.map((opt) => (
            <div key={opt.value} className="lt-mode-sel__desc">
              <strong>{opt.label}:</strong> {opt.desc}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
