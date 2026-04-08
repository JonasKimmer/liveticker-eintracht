import { useRef, useEffect } from "react";
import { DROPDOWN_LIST_STYLE } from "./dropdownStyles";

interface DropdownListItem {
  key: string | number;
  label: string;
  val: string | number;
}

interface DropdownListProps {
  filtered: DropdownListItem[];
  value: string | number | null;
  total: number;
  unit: string;
  onSelect: (val: string | number) => void;
  activeIdx?: number;
}

export function DropdownList({
  filtered,
  value,
  total,
  unit,
  onSelect,
  activeIdx = -1,
}: DropdownListProps) {
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (activeIdx >= 0) {
      itemRefs.current[activeIdx]?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIdx]);

  return (
    <div style={DROPDOWN_LIST_STYLE}>
      <div style={{ maxHeight: 220, overflowY: "auto" }}>
        {filtered.length === 0 ? (
          <div
            style={{
              padding: "0.7rem 0.85rem",
              color: "var(--lt-text-muted)",
              fontSize: "0.78rem",
              fontFamily: "var(--lt-font-mono)",
            }}
          >
            Keine Treffer
          </div>
        ) : (
          filtered.map(({ key, label, val }, idx) => {
            const isActive = idx === activeIdx;
            const isSelected = val === value;
            return (
              <button
                key={key}
                ref={(el) => {
                  itemRefs.current[idx] = el as HTMLButtonElement;
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(val);
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "0.55rem 0.85rem",
                  background: isActive
                    ? "var(--lt-accent-dim)"
                    : isSelected
                      ? "rgba(255,255,255,0.04)"
                      : "transparent",
                  border: "none",
                  borderBottom: "1px solid var(--lt-border)",
                  borderLeft: isActive
                    ? "2px solid var(--lt-accent)"
                    : "2px solid transparent",
                  color:
                    isActive || isSelected
                      ? "var(--lt-accent)"
                      : "var(--lt-text)",
                  fontFamily: "var(--lt-font-mono)",
                  fontSize: "0.78rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "background 0.1s",
                }}
              >
                {isSelected && (
                  <span style={{ color: "var(--lt-accent)" }}>✓</span>
                )}
                {label}
              </button>
            );
          })
        )}
      </div>
      <div
        style={{
          padding: "0.45rem 0.85rem",
          borderTop: "1px solid var(--lt-border)",
          color: "var(--lt-text-muted)",
          fontSize: "0.72rem",
          fontFamily: "var(--lt-font-mono)",
          lineHeight: 1.4,
        }}
      >
        {filtered.length} / {total} {unit} · ↑↓ Enter
      </div>
    </div>
  );
}
