// ============================================================
// CommandsModal — Slash-Command Referenz-Overlay
// Triggered by: double-click on image in PublishedEntry,
//               or lt-show-commands custom event
// ============================================================

const COMMANDS = [
  ["/g Müller EF",           "⚽ TOR — Müller (Eintracht)"],
  ["/og Müller EF",          "⚽ EIGENTOR — Müller (Eintracht)"],
  ["/gelb Müller EF",        "🟨 GELBE KARTE — Müller (Eintracht)"],
  ["/rot Müller EF",         "🟥 ROTE KARTE — Müller (Eintracht)"],
  ["/ep Müller EF",          "❌ ELFMETER verschossen — Müller"],
  ["/s Kimmich Coman EF",    "🔄 WECHSEL — Kimmich ↔ Coman"],
  ["/n Ecke für Eintracht",  "📝 Ecke für Eintracht"],
  ["/anpfiff 45",            "📣 Anpfiff — 45. Minute"],
  ["/hz",                    "🔔 Halbzeit"],
];

interface CommandsModalProps { onClose: () => void; }

export function CommandsModal({ onClose }: CommandsModalProps) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--lt-bg-card)", border: "1px solid var(--lt-border)",
          borderRadius: 12, padding: "1.5rem", maxWidth: 420, width: "90%",
          boxShadow: "0 24px 48px rgba(0,0,0,0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          fontFamily: "var(--lt-font-mono)", fontSize: "0.7rem", fontWeight: 700,
          textTransform: "uppercase", letterSpacing: "0.1em",
          color: "var(--lt-text-muted)", marginBottom: "1rem",
        }}>
          ⚡ Slash Commands
        </div>

        {COMMANDS.map(([cmd, result]) => (
          <div key={cmd} style={{ marginBottom: "0.75rem" }}>
            <code style={{
              fontFamily: "var(--lt-font-mono)", fontSize: "0.82rem",
              color: "var(--lt-accent)", background: "var(--lt-accent-dim)",
              padding: "2px 6px", borderRadius: 4,
            }}>
              {cmd}
            </code>
            <div style={{
              fontFamily: "var(--lt-font-mono)", fontSize: "0.75rem",
              color: "var(--lt-text-muted)", marginTop: "0.2rem",
            }}>
              → {result}
            </div>
          </div>
        ))}

        <button
          onClick={onClose}
          style={{
            marginTop: "0.5rem", width: "100%", padding: "0.5rem",
            background: "var(--lt-bg-card-2)", border: "1px solid var(--lt-border)",
            borderRadius: 6, color: "var(--lt-text-muted)",
            fontFamily: "var(--lt-font-mono)", fontSize: "0.75rem", cursor: "pointer",
          }}
        >
          Schließen
        </button>
      </div>
    </div>
  );
}

