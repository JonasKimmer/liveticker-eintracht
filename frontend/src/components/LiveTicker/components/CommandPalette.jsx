import { memo, useState, useMemo } from "react";
import PropTypes from "prop-types";
import { createPortal } from "react-dom";
import { parseCommand } from "../utils/parseCommand";

export const COMMAND_PALETTE = [
  { cmd: "/g",        desc: "Tor",                    icon: "⚽", hint: "Spieler Team" },
  { cmd: "/og",       desc: "Eigentor",               icon: "⚽", hint: "Spieler Team" },
  { cmd: "/gelb",     desc: "Gelbe Karte",            icon: "🟨", hint: "Spieler Team" },
  { cmd: "/rot",      desc: "Rote Karte",             icon: "🟥", hint: "Spieler Team" },
  { cmd: "/ep",       desc: "Elfmeter verschossen",   icon: "❌", hint: "Spieler Team" },
  { cmd: "/s",        desc: "Wechsel",                icon: "🔄", hint: "Ein Aus Team" },
  { cmd: "/n",        desc: "Notiz",                  icon: "📝", hint: "Text" },
  null,
  { cmd: "/prematch", desc: "Prematch",               icon: "📣", hint: "" },
  { cmd: "/anpfiff",  desc: "Anpfiff",                icon: "📣", hint: "Minute" },
  { cmd: "/hz",       desc: "Halbzeit",               icon: "🔔", hint: "" },
  { cmd: "/2hz",      desc: "2. Halbzeit",            icon: "📣", hint: "Minute" },
  { cmd: "/pause",    desc: "Pause (2. HZ)",          icon: "🔔", hint: "" },
  { cmd: "/vz1",      desc: "Verlängerung 1. HZ",     icon: "📣", hint: "Minute" },
  { cmd: "/vzp",      desc: "VZ-Pause",               icon: "🔔", hint: "" },
  { cmd: "/vz2",      desc: "Verlängerung 2. HZ",     icon: "📣", hint: "Minute" },
  { cmd: "/elfmeter", desc: "Elfmeterschießen",       icon: "🥅", hint: "" },
  { cmd: "/abpfiff",  desc: "Abpfiff",                icon: "📣", hint: "" },
];

export const NEEDS_ARG = ["/anpfiff", "/2hz", "/vz1", "/vz2", "/g", "/og", "/gelb", "/rot", "/ep", "/c", "/s", "/n"];

export function useCommandPalette(value) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteIdx, setPaletteIdx] = useState(0);

  const cmdToken = value.startsWith("/") && !value.includes(" ")
    ? value.toLowerCase()
    : value === "/" ? "/" : null;

  const filteredCmds = useMemo(() => {
    if (!cmdToken) return [];
    const items = COMMAND_PALETTE.filter(Boolean);
    if (cmdToken === "/" || cmdToken === "/?") return items;
    return items.filter((c) => c.cmd.startsWith(cmdToken));
  }, [cmdToken]);

  const showPalette = paletteOpen && filteredCmds.length > 0;

  function onValueChange(v) {
    if (v.startsWith("/") && !v.includes(" ")) {
      setPaletteOpen(true);
      setPaletteIdx(0);
    } else {
      setPaletteOpen(false);
    }
  }

  function selectCmd(cmd, setValue) {
    setValue(cmd + (NEEDS_ARG.includes(cmd) ? " " : ""));
    setPaletteOpen(false);
  }

  function handlePaletteKeyDown(e, setValue) {
    if (!showPalette) return false;
    if (e.key === "ArrowDown") { e.preventDefault(); setPaletteIdx((i) => Math.min(i + 1, filteredCmds.length - 1)); return true; }
    if (e.key === "ArrowUp")   { e.preventDefault(); setPaletteIdx((i) => Math.max(i - 1, 0)); return true; }
    if (e.key === "Tab" || e.key === "Enter") {
      e.preventDefault();
      if (filteredCmds[paletteIdx]) selectCmd(filteredCmds[paletteIdx].cmd, setValue);
      return true;
    }
    if (e.key === "Escape") { setPaletteOpen(false); return true; }
    return false;
  }

  return { showPalette, paletteIdx, filteredCmds, setPaletteOpen, onValueChange, selectCmd, handlePaletteKeyDown };
}

export const CommandPalettePortal = memo(function CommandPalettePortal({ show, items, activeIdx, anchorRef, onSelect }) {
  if (!show || !items.length || !anchorRef?.current) return null;

  const rect = anchorRef.current.getBoundingClientRect();
  const paletteHeight = Math.min(items.length * 36 + 8, 280);
  const spaceAbove = rect.top;
  const top = spaceAbove > paletteHeight + 8
    ? rect.top - paletteHeight - 4
    : rect.bottom + 4;

  return createPortal(
    <div style={{
      position: "fixed",
      top,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
      background: "var(--lt-bg-card)",
      border: "1px solid var(--lt-border)",
      borderRadius: 8,
      boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
      overflow: "hidden",
      maxHeight: 280,
      overflowY: "auto",
    }}>
      {items.map((c, i) => (
        <div
          key={c.cmd}
          onMouseDown={(e) => { e.preventDefault(); onSelect(c.cmd); }}
          style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            padding: "0.45rem 0.75rem",
            background: i === activeIdx ? "rgba(255,255,255,0.07)" : "transparent",
            cursor: "pointer",
            fontFamily: "var(--lt-font-mono)", fontSize: "0.78rem",
          }}
        >
          <span style={{ width: 20, flexShrink: 0 }}>{c.icon}</span>
          <span style={{ color: "var(--lt-accent)", minWidth: 90, flexShrink: 0 }}>{c.cmd}</span>
          <span style={{ color: "var(--lt-text-muted)" }}>{c.desc}</span>
          {c.hint && <span style={{ marginLeft: "auto", color: "var(--lt-text-faint)", fontSize: "0.68rem" }}>{c.hint}</span>}
        </div>
      ))}
    </div>,
    document.body
  );
});

CommandPalettePortal.propTypes = {
  show: PropTypes.bool.isRequired,
  items: PropTypes.arrayOf(PropTypes.shape({
    cmd: PropTypes.string.isRequired,
    desc: PropTypes.string.isRequired,
    icon: PropTypes.string.isRequired,
    hint: PropTypes.string,
  })).isRequired,
  activeIdx: PropTypes.number.isRequired,
  anchorRef: PropTypes.shape({ current: PropTypes.instanceOf(Element) }).isRequired,
  onSelect: PropTypes.func.isRequired,
};

/**
 * Gibt { text, icon } für einen Publish-Vorgang zurück.
 * - Valid Command (/g Müller Eintracht) → formatierter Text + Icon
 * - Bekannter Command + Freitext (/og Müller trifft...) → Freitext + Icon
 * - Bekannter Command allein (/og) → Command-Beschreibung + Icon
 */
export function resolvePublishPayload(rawText, minute) {
  const text = rawText.trim();
  if (!text.startsWith("/")) return { text, icon: null };
  const parsed = parseCommand(text, minute);
  if (parsed.isValid) return { text: parsed.formatted, icon: parsed.meta.icon ?? null };
  if (parsed.meta?.icon) {
    const stripped = text.replace(/^\/\w+\s*/, "").trim();
    const cmdToken = text.split(/\s+/)[0].toLowerCase();
    const cmdEntry = COMMAND_PALETTE.filter(Boolean).find((c) => c.cmd === cmdToken);
    return { text: stripped || cmdEntry?.desc || parsed.formatted, icon: parsed.meta.icon };
  }
  return { text, icon: null };
}
