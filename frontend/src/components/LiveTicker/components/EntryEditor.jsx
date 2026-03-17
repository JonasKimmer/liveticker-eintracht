// ============================================================
// EntryEditor.jsx  — Slash-Command Editor mit Autocomplete
// ============================================================
import React, { useState, useEffect, useMemo, useRef } from "react";
import { parseCommand } from "../utils/parseCommand";
import { MODES } from "../constants";

const COMMAND_PALETTE = [
  { cmd: "/g",        desc: "Tor",                    icon: "⚽", hint: "Spieler Team" },
  { cmd: "/og",       desc: "Eigentor",               icon: "⚽", hint: "Spieler Team" },
  { cmd: "/gelb",     desc: "Gelbe Karte",            icon: "🟨", hint: "Spieler Team" },
  { cmd: "/rot",      desc: "Rote Karte",             icon: "🟥", hint: "Spieler Team" },
  { cmd: "/ep",       desc: "Elfmeter verschossen",   icon: "❌", hint: "Spieler Team" },
  { cmd: "/s",        desc: "Wechsel",                icon: "🔄", hint: "Ein Aus Team" },
  { cmd: "/n",        desc: "Notiz",                  icon: "📝", hint: "Text" },
  null, // separator
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

export function EntryEditor({
  value,
  onChange,
  onPublish,
  onCancel,
  mode,
  currentMinute = 0,
  playerNames = [],
}) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteIdx, setPaletteIdx] = useState(0);
  const [nameIdx, setNameIdx] = useState(0);
  const textareaRef = useRef(null);

  // Live minute — starts from currentMinute, ticks every 60s, can be manually overridden
  const [minute, setMinute] = useState(currentMinute);
  const [minuteEditing, setMinuteEditing] = useState(false);
  const [minuteOverride, setMinuteOverride] = useState(false);
  const minuteRef = useRef(null);

  // Sync from prop when not manually overridden
  useEffect(() => {
    if (!minuteOverride) setMinute(currentMinute);
  }, [currentMinute, minuteOverride]);

  // Tick up every 60s when minute > 0 and not overridden
  useEffect(() => {
    if (minuteOverride || minute === 0) return;
    const id = setInterval(() => setMinute((m) => m + 1), 60000);
    return () => clearInterval(id);
  }, [minuteOverride, minute]);

  // Which commands to show in palette (filter by typed prefix)
  const cmdToken = value.startsWith("/") && !value.includes(" ")
    ? value.toLowerCase()
    : value === "/"
      ? "/"
      : null;

  const filteredCmds = useMemo(() => {
    if (!cmdToken) return [];
    const items = COMMAND_PALETTE.filter(Boolean);
    if (cmdToken === "/" || cmdToken === "/?") return items;
    return items.filter((c) => c.cmd.startsWith(cmdToken));
  }, [cmdToken]);

  const showPalette = paletteOpen && filteredCmds.length > 0;

  // Live preview
  const preview = useMemo(() => {
    if (!value.trim().startsWith("/")) return null;
    return parseCommand(value.trim(), minute);
  }, [value, minute]);

  // Last typed word (for name autocomplete)
  const lastWord = useMemo(() => {
    if (value.startsWith("/") && !value.includes(" ")) return "";
    const words = value.split(/\s+/);
    return words[words.length - 1] ?? "";
  }, [value]);

  // Name suggestions: match full name OR any word within name
  const nameSuggestions = useMemo(() => {
    if (!lastWord) return [];
    const q = lastWord.toLowerCase();
    return playerNames
      .filter((name) => {
        const parts = name.toLowerCase().split(/\s+/);
        return parts.some((part) => part.startsWith(q) && part !== q) ||
               (name.toLowerCase().startsWith(q) && name.toLowerCase() !== q);
      })
      .slice(0, 6);
  }, [lastWord, playerNames]);

  const showNames = nameSuggestions.length > 0 && !showPalette;

  // Reset name index when suggestions change
  useEffect(() => { setNameIdx(0); }, [nameSuggestions]);

  const selectName = (name) => {
    // Replace the lastWord with the full name
    const words = value.split(/\s+/);
    words[words.length - 1] = name;
    onChange(words.join(" ") + " ");
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const selectCmd = (cmd) => {
    const needsArg = ["/anpfiff", "/2hz", "/vz1", "/vz2", "/g", "/og", "/gelb", "/rot", "/ep", "/c", "/s", "/n"].includes(cmd);
    onChange(cmd + (needsArg ? " " : ""));
    setPaletteOpen(false);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleChange = (e) => {
    const v = e.target.value;
    onChange(v);
    if (v.startsWith("/") && !v.includes(" ")) {
      setPaletteOpen(true);
      setPaletteIdx(0);
    } else {
      setPaletteOpen(false);
    }
  };

  const handleKeyDown = (e) => {
    // Command palette navigation
    if (showPalette) {
      if (e.key === "ArrowDown") { e.preventDefault(); setPaletteIdx((i) => Math.min(i + 1, filteredCmds.length - 1)); return; }
      if (e.key === "ArrowUp")   { e.preventDefault(); setPaletteIdx((i) => Math.max(i - 1, 0)); return; }
      if (e.key === "Tab" || e.key === "Enter") {
        e.preventDefault();
        if (filteredCmds[paletteIdx]) selectCmd(filteredCmds[paletteIdx].cmd);
        return;
      }
      if (e.key === "Escape") { setPaletteOpen(false); return; }
    }

    // Name suggestions navigation
    if (showNames) {
      if (e.key === "ArrowDown") { e.preventDefault(); setNameIdx((i) => Math.min(i + 1, nameSuggestions.length - 1)); return; }
      if (e.key === "ArrowUp")   { e.preventDefault(); setNameIdx((i) => Math.max(i - 1, 0)); return; }
      if (e.key === "Tab" || e.key === "Enter") {
        if (nameSuggestions[nameIdx]) { e.preventDefault(); selectName(nameSuggestions[nameIdx]); return; }
      }
      if (e.key === "Escape") { onChange(value); return; }
    }

    // Enter: valid event command → format first; phase cmd with extra text or invalid → publish directly
    if (e.key === "Enter" && !e.ctrlKey && !e.shiftKey) {
      const trimmed = value.trim();
      const afterCmd = trimmed.replace(/^\/\w+\s*/, "");
      const isPhaseWithText = trimmed.startsWith("/") && preview?.isValid && preview.meta?.phase != null && afterCmd;
      if (trimmed.startsWith("/") && preview?.isValid && !isPhaseWithText) {
        e.preventDefault();
        onChange(preview.formatted);
      } else {
        e.preventDefault();
        handlePublish();
      }
      return;
    }

    // Ctrl+Enter = publish (immer)
    if (e.ctrlKey && e.key === "Enter") {
      e.preventDefault();
      handlePublish();
    }
  };

  const handlePublish = () => {
    if (!value.trim()) return;
    const trimmed = value.trim();
    const afterCmd = trimmed.replace(/^\/\w+\s*/, "");
    if (trimmed.startsWith("/") && preview?.isValid) {
      const meta = preview.meta ?? {};
      // Phase commands (e.g. /prematch, /elfmeter) with extra text → free text mode
      if (meta.phase != null && afterCmd) {
        onPublish?.({ text: afterCmd, icon: meta.icon ?? "📣", minute: minute != null ? minute : null, phase: null });
      } else if (meta.phase != null) {
        // Phase command ohne extra Text → Template + Phase
        onPublish?.({
          text: preview.formatted,
          icon: meta.icon ?? "📣",
          minute: meta.minute ?? minute ?? null,
          phase: meta.phase,
        });
      } else {
        // Event command (/g, /gelb etc.) → freier Text nach Prefix + Icon
        onPublish?.({ text: afterCmd || trimmed, icon: meta.icon ?? "📣", minute: meta.minute ?? minute ?? null, phase: null });
      }
    } else if (trimmed.startsWith("/")) {
      // Invalid command → free text with command icon, strip prefix
      const icon = preview?.meta?.icon ?? "📣";
      onPublish?.({ text: afterCmd || trimmed, icon, minute: minute != null ? minute : null, phase: null });
    } else {
      onPublish?.({ text: trimmed, icon: "📣", minute: minute != null ? minute : null, phase: null });
    }
    onChange("");
  };

  const publishDisabled = !value.trim();

  return (
    <div className="lt-editor">
      <div className="lt-editor__toolbar">
        <span className="lt-editor__label">
          {mode === MODES.MANUAL ? "Manueller Eintrag" : "Entwurf bearbeiten"}
        </span>
        <div className="lt-editor__minute">
          {minuteEditing ? (
            <input
              ref={minuteRef}
              type="number"
              className="lt-editor__minute-input"
              value={minute}
              min={0}
              max={120}
              onChange={(e) => {
                setMinute(Number(e.target.value));
                setMinuteOverride(true);
              }}
              onBlur={() => setMinuteEditing(false)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") setMinuteEditing(false); }}
              autoFocus
            />
          ) : (
            <button
              className={`lt-editor__minute-btn${minuteOverride ? " lt-editor__minute-btn--manual" : ""}`}
              onClick={() => { setMinuteEditing(true); }}
              title={minuteOverride ? "Manuell gesetzt – klicken zum Ändern" : "Live-Minute – klicken zum Überschreiben"}
            >
              {minute > 0 ? `${minute}'` : "–'"}
              {!minuteOverride && <span className="lt-editor__minute-live" />}
            </button>
          )}
          {minuteOverride && (
            <button
              className="lt-editor__minute-reset"
              onClick={() => { setMinuteOverride(false); setMinute(currentMinute); }}
              title="Auf Live-Minute zurücksetzen"
            >↺</button>
          )}
        </div>
      </div>

      <div className="lt-editor__input-wrap">
        {/* Command palette */}
        {showPalette && (
          <div className="lt-cmd-palette">
            {filteredCmds.map((c, i) => (
              <div
                key={c.cmd}
                className={`lt-cmd-palette__item${i === paletteIdx ? " lt-cmd-palette__item--active" : ""}`}
                onMouseDown={(e) => { e.preventDefault(); selectCmd(c.cmd); }}
              >
                <span className="lt-cmd-palette__icon">{c.icon}</span>
                <span className="lt-cmd-palette__cmd">{c.cmd}</span>
                <span className="lt-cmd-palette__desc">{c.desc}</span>
                {c.hint && <span className="lt-cmd-palette__hint">{c.hint}</span>}
              </div>
            ))}
          </div>
        )}

        {/* Name suggestions dropdown */}
        {showNames && (
          <div className="lt-cmd-palette lt-name-palette">
            {nameSuggestions.map((name, i) => {
              // Highlight the matching part
              const q = lastWord.toLowerCase();
              const lname = name.toLowerCase();
              const matchIdx = lname.indexOf(q);
              const before = name.slice(0, matchIdx);
              const match = name.slice(matchIdx, matchIdx + q.length);
              const after = name.slice(matchIdx + q.length);
              return (
                <div
                  key={name}
                  className={`lt-cmd-palette__item${i === nameIdx ? " lt-cmd-palette__item--active" : ""}`}
                  onMouseDown={(e) => { e.preventDefault(); selectName(name); }}
                >
                  <span className="lt-cmd-palette__icon">👤</span>
                  <span className="lt-cmd-palette__cmd">
                    {before}<strong>{match}</strong>{after}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <textarea
          ref={textareaRef}
          className="lt-editor__textarea"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Ticker-Eintrag …"
          rows={3}
        />

        {!value && (
          <div className="lt-editor__hint">
            <span>↵</span> Veröffentlichen · <span>/?</span> alle Commands
          </div>
        )}
      </div>

      {/* Live Preview */}
      {preview && (() => {
        const afterCmd = value.trim().replace(/^\/\w+\s*/, "");
        const isPhaseWithText = preview.isValid && preview.meta?.phase != null && afterCmd;
        const isFreeTextMode = !preview.isValid || isPhaseWithText;
        const displayText = isFreeTextMode ? (afterCmd || value.trim()) : preview.formatted;
        return (
        <div className={`lt-editor__preview${!isFreeTextMode ? " lt-editor__preview--valid" : ""}`}>
          <div className="lt-editor__preview-label">
            {!isFreeTextMode ? "✓ Vorschau" : `✎ Freitext mit ${preview.meta?.icon ?? "📣"}`}
          </div>
          <div className={`lt-editor__preview-text${!isFreeTextMode ? " lt-editor__preview-text--valid" : ""}`}>
            {preview.meta?.minute ? <span style={{ opacity: 0.6, marginRight: "0.4rem" }}>{preview.meta.minute}'</span> : null}
            {preview.meta?.icon && <span style={{ marginRight: "0.35rem" }}>{preview.meta.icon}</span>}
            {displayText}
          </div>
          {preview.warnings.map((w, i) => (
            <div key={i} className="lt-editor__preview-warning">⚠ {w}</div>
          ))}
        </div>
        );
      })()}

      <div className="lt-editor__actions">
        {onCancel && (
          <button className="lt-btn lt-btn--ghost" onClick={onCancel}>Abbrechen</button>
        )}
        <button
          className="lt-btn lt-btn--primary"
          onClick={handlePublish}
          disabled={publishDisabled}
        >
          Veröffentlichen
        </button>
      </div>
    </div>
  );
}
