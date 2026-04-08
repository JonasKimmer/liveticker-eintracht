import { Dropdown } from "../dropdown/Dropdown";
import type { TickerMode } from "../../../../types";

const MODE_ITEMS = [
  { value: "auto" as const, label: "⚡ Auto" },
  { value: "coop" as const, label: "🤝 Co-Op" },
  { value: "manual" as const, label: "✍️ Manuell" },
];

interface TickerModeSelectorProps {
  value: TickerMode;
  onChange: (mode: TickerMode) => void;
}

export function TickerModeSelector({
  value,
  onChange,
}: TickerModeSelectorProps) {
  const active = MODE_ITEMS.find((o) => o.value === value);
  return (
    <Dropdown
      label="Ticker-Modus"
      value={value}
      placeholder="Modus wählen"
      displayValue={active?.label}
      items={MODE_ITEMS}
      onSelect={(v) => onChange(v as TickerMode)}
    />
  );
}
