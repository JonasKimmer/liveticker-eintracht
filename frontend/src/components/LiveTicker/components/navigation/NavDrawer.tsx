// ============================================================
// NavDrawer.jsx — Slide-in Drawer für Match-Wechsel
// ============================================================
import { StartScreen } from "./StartScreen";
import type { StartScreenProps } from "./StartScreen";

interface NavDrawerProps {
  open: boolean;
  onClose: () => void;
  navProps: StartScreenProps;
}

export function NavDrawer({ open, onClose, navProps }: NavDrawerProps) {
  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 100,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(3px)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.25s ease",
        }}
      />
      {/* Drawer Panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          zIndex: 101,
          width: "min(420px, 100vw)",
          background: "var(--lt-bg-card)",
          borderLeft: "1px solid var(--lt-border)",
          boxShadow: "-12px 0 40px rgba(0,0,0,0.5)",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.28s cubic-bezier(0.32,0,0.24,1)",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "1rem 1.25rem",
            borderBottom: "1px solid var(--lt-border)",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontFamily: "var(--lt-font-mono)",
              fontSize: "0.75rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--lt-text-muted)",
            }}
          >
            Match wechseln
          </span>
          <button
            onClick={onClose}
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: "var(--lt-bg-card-2)",
              border: "1px solid var(--lt-border)",
              color: "var(--lt-text-muted)",
              cursor: "pointer",
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>
        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          <StartScreen
            {...navProps}
            compact
            onMatchChange={(id) => {
              navProps.onMatchChange(id);
              onClose();
            }}
          />
        </div>
      </div>
    </>
  );
}
