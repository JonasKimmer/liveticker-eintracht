// ============================================================
// PickerPanelShell.tsx
// Wiederverwendbarer Rahmen fuer Picker-Panels (Social, Media, Clips).
// Kapselt: Collapsible-Header, Status-Meldung, Import/Refresh-
// Buttons, Lade- und Leer-Zustand sowie das Content-Grid.
// Panel-spezifisches Verhalten (Icon, Farben, Karten) wird
// ueber Props injiziert.
// ============================================================

import { memo, type ReactNode } from "react";

const CHEVRON_SVG = (
  <svg
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    style={{ width: 14, height: 14 }}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 9l-7 7-7-7"
    />
  </svg>
);

interface StatusMsg {
  type: "error" | "success";
  text: string;
}

function StatusMessage({ msg }: { msg: StatusMsg | null }) {
  if (!msg) return null;
  return (
    <div
      className={`lt-status-msg ${msg.type === "error" ? "lt-status-msg--error" : "lt-status-msg--success"}`}
    >
      {msg.text}
    </div>
  );
}

export interface PickerPanelShellProps {
  open: boolean;
  onToggle: () => void;
  icon: ReactNode;
  label: string;
  badgeCount: number;
  badgeBackground: string;
  importing: boolean;
  loading: boolean;
  onImport: () => void;
  onRefresh: () => void;
  importLabel: string;
  importingLabel?: string;
  importBackground: string;
  emptyLabel: string;
  hintLabel?: string;
  statusMsg?: StatusMsg | null;
  gridColumns?: string;
  children?: ReactNode;
}

export const PickerPanelShell = memo(function PickerPanelShell({
  open,
  onToggle,
  icon,
  label,
  badgeCount,
  badgeBackground,
  importing,
  loading,
  onImport,
  onRefresh,
  importLabel,
  importingLabel = "Importiert\u2026",
  importBackground,
  emptyLabel,
  hintLabel,
  statusMsg,
  gridColumns = "1fr 1fr",
  children,
}: PickerPanelShellProps) {
  return (
    <div
      style={{
        borderRadius: 8,
        border: "1px solid var(--lt-border)",
        background: "var(--lt-bg-card)",
        overflow: "hidden",
      }}
    >
      {/* -- Collapsible Header --------------------------------- */}
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.65rem 1rem",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = "var(--lt-bg-hover)")
        }
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontFamily: "var(--lt-font-mono)",
            fontSize: "0.7rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "var(--lt-text-muted)",
          }}
        >
          <span style={{ fontSize: "0.85rem" }}>{icon}</span>
          <span>{label}</span>
          {badgeCount > 0 && (
            <span
              style={{
                background: badgeBackground,
                color: "#fff",
                fontSize: "0.6rem",
                fontWeight: 700,
                borderRadius: 4,
                padding: "1px 6px",
                lineHeight: 1.4,
              }}
            >
              {badgeCount}
            </span>
          )}
        </span>
        <span
          style={{
            color: "var(--lt-text-faint)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
            display: "flex",
          }}
        >
          {CHEVRON_SVG}
        </span>
      </button>

      {/* -- Body (nur sichtbar wenn offen) --------------------- */}
      {open && (
        <div
          style={{
            padding: "0.75rem 1rem 1rem",
            borderTop: "1px solid var(--lt-border)",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          <StatusMessage msg={statusMsg ?? null} />

          {/* Import + Refresh */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button
              onClick={onImport}
              disabled={importing}
              style={{
                flexShrink: 0,
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "0.4rem 0.75rem",
                borderRadius: 6,
                border: "none",
                background: importing
                  ? "var(--lt-bg-card-2)"
                  : importBackground,
                color: importing ? "var(--lt-text-faint)" : "#fff",
                fontFamily: "var(--lt-font-mono)",
                fontSize: "0.72rem",
                fontWeight: 700,
                cursor: importing ? "not-allowed" : "pointer",
              }}
            >
              {importing ? importingLabel : importLabel}
            </button>
            <button
              onClick={onRefresh}
              disabled={loading}
              style={{
                flexShrink: 0,
                padding: "0.4rem 0.6rem",
                borderRadius: 6,
                border: "1px solid var(--lt-border)",
                background: "transparent",
                color: "var(--lt-text-muted)",
                fontFamily: "var(--lt-font-mono)",
                fontSize: "0.7rem",
                cursor: loading ? "not-allowed" : "pointer",
              }}
              title="Aktualisieren"
            >
              ↺
            </button>
          </div>

          {/* Lade-Zustand */}
          {loading && (
            <p
              style={{
                textAlign: "center",
                padding: "1rem 0",
                fontFamily: "var(--lt-font-mono)",
                fontSize: "0.72rem",
                color: "var(--lt-text-faint)",
              }}
            >
              Lädt…
            </p>
          )}

          {/* Leer-Zustand */}
          {!loading && badgeCount === 0 && (
            <p
              style={{
                textAlign: "center",
                padding: "1rem 0",
                fontFamily: "var(--lt-font-mono)",
                fontSize: "0.72rem",
                color: "var(--lt-text-faint)",
              }}
            >
              {emptyLabel}
            </p>
          )}

          {/* Content-Grid */}
          {!loading && badgeCount > 0 && (
            <>
              {hintLabel && (
                <p
                  style={{
                    fontFamily: "var(--lt-font-mono)",
                    fontSize: "0.62rem",
                    color: "var(--lt-text-faint)",
                    letterSpacing: "0.04em",
                    margin: 0,
                  }}
                >
                  {hintLabel}
                </p>
              )}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: gridColumns,
                  gap: "0.4rem",
                }}
              >
                {children}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
});
