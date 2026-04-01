// ============================================================
// EntryEditor.jsx  — Slash-Command Editor mit Autocomplete
// ============================================================
import React, { memo, useState, useMemo, useCallback, useRef } from "react";
import { parseCommand } from "../../utils/parseCommand";
import { COMMAND_PALETTE, NEEDS_ARG } from "../CommandPalette";
import { MODES, COMMAND_PREFIX_REGEX } from "../../constants";
import { useLiveMinuteEditor } from "../../hooks/useLiveMinuteEditor";
import { useNameAutocomplete } from "hooks/useNameAutocomplete";
import { MinuteEditor } from "../MinuteEditor";

import type { TickerMode, PublishPayload } from "../../../../types";

interface EntryEditorProps {
  value: string;
  onChange: (v: string) => void;
  onPublish: (payload: PublishPayload) => void;
  onCancel?: () => void;
  mode?: TickerMode;
  currentMinute?: number;
  playerNames?: string[];
}

export const EntryEditor = memo(function EntryEditor({
  value,
  onChange,
  onPublish,
  onCancel,
  mode,
  currentMinute = 0,
  playerNames = [],
}: EntryEditorProps) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteIdx, setPaletteIdx] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Live minute — syncs from prop, ticks every 60s, can be manually overridden
  const {
    minute,
    setMinute,
    minuteEditing,
    setMinuteEditing,
    minuteOverride,
    setMinuteOverride,
  } = useLiveMinuteEditor(currentMinute);
  // Which commands to show in palette (filter by typed prefix)
  const cmdToken =
    value.startsWith("/") && !value.includes(" ")
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

  const {
    lastWord,
    nameSuggestions,
    showNames,
    nameIdx,
    setNameIdx,
    selectName,
  } = useNameAutocomplete(value, playerNames, {
    showPalette,
    onReplace: onChange,
    inputRef: textareaRef,
  });

  const selectCmd = useCallback(
    (cmd: string) => {
      onChange(cmd + (NEEDS_ARG.includes(cmd) ? " " : ""));
      setPaletteOpen(false);
      setTimeout(() => textareaRef.current?.focus(), 0);
    },
    [onChange],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const v = e.target.value;
      onChange(v);
      if (v.startsWith("/") && !v.includes(" ")) {
        setPaletteOpen(true);
        setPaletteIdx(0);
      } else {
        setPaletteOpen(false);
      }
    },
    [onChange],
  );

  const handlePublish = useCallback(() => {
    if (!value.trim()) return;
    const trimmed = value.trim();
    const afterCmd = trimmed.replace(COMMAND_PREFIX_REGEX, "");
    if (trimmed.startsWith("/") && preview?.isValid) {
      const meta = preview.meta;
      // Phase commands (e.g. /prematch, /elfmeter) with extra text → free text mode
      if (meta.phase != null && afterCmd) {
        onPublish?.({
          text: afterCmd,
          icon: meta.icon ?? "📣",
          minute: minute != null ? minute : null,
          phase: null,
        });
      } else if (meta.phase != null) {
        // Phase command ohne extra Text → Template + Phase
        onPublish?.({
          text: preview.formatted,
          icon: meta.icon ?? "📣",
          minute: meta.minute ?? minute ?? null,
          phase: meta.phase as import("../../../../types").MatchPhase | null,
        });
      } else {
        // Event command (/g, /gelb etc.) → freier Text nach Prefix + Icon
        onPublish?.({
          text: afterCmd || trimmed,
          icon: meta.icon ?? "📣",
          minute: meta.minute ?? minute ?? null,
          phase: null,
        });
      }
    } else if (trimmed.startsWith("/")) {
      // Invalid/incomplete command → use command icon if known, strip prefix
      const icon = preview?.meta?.icon ?? "📣";
      const text =
        preview?.meta?.icon && afterCmd ? afterCmd : afterCmd || trimmed;
      onPublish?.({
        text,
        icon,
        minute: minute != null ? minute : null,
        phase: null,
      });
    } else {
      onPublish?.({
        text: trimmed,
        icon: "📣",
        minute: minute != null ? minute : null,
        phase: null,
      });
    }
    onChange("");
  }, [value, preview, minute, onPublish, onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Command palette navigation
      if (showPalette) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setPaletteIdx((i) => Math.min(i + 1, filteredCmds.length - 1));
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setPaletteIdx((i) => Math.max(i - 1, 0));
          return;
        }
        if (e.key === "Tab" || e.key === "Enter") {
          e.preventDefault();
          if (filteredCmds[paletteIdx]) selectCmd(filteredCmds[paletteIdx].cmd);
          return;
        }
        if (e.key === "Escape") {
          setPaletteOpen(false);
          return;
        }
      }

      // Name suggestions navigation
      if (showNames) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setNameIdx((i) => Math.min(i + 1, nameSuggestions.length - 1));
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setNameIdx((i) => Math.max(i - 1, 0));
          return;
        }
        if (e.key === "Tab" || e.key === "Enter") {
          if (nameSuggestions[nameIdx]) {
            e.preventDefault();
            selectName(nameSuggestions[nameIdx]);
            return;
          }
        }
        if (e.key === "Escape") {
          onChange(value);
          return;
        }
      }

      // Enter: valid event command → format first; phase cmd with extra text or invalid → publish directly
      if (e.key === "Enter" && !e.ctrlKey && !e.shiftKey) {
        const trimmed = value.trim();
        const afterCmd = trimmed.replace(COMMAND_PREFIX_REGEX, "");
        const isPhaseWithText =
          trimmed.startsWith("/") &&
          preview?.isValid &&
          preview.meta?.phase != null &&
          afterCmd;
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
    },
    [
      showPalette,
      showNames,
      filteredCmds,
      paletteIdx,
      nameSuggestions,
      nameIdx,
      value,
      preview,
      onChange,
      handlePublish,
      selectCmd,
      selectName,
    ],
  );

  const publishDisabled = !value.trim();

  const previewDisplay = useMemo(() => {
    if (!preview) return null;
    const afterCmd = value.trim().replace(COMMAND_PREFIX_REGEX, "");
    const isPhaseWithText =
      preview.isValid && preview.meta?.phase != null && afterCmd;
    const isFreeTextMode = !preview.isValid || isPhaseWithText;
    const displayText = isFreeTextMode
      ? afterCmd || value.trim()
      : preview.formatted;
    return { isFreeTextMode, displayText };
  }, [preview, value]);

  return (
    <div className="lt-editor">
      <div className="lt-editor__toolbar">
        <span className="lt-editor__label">
          {mode === MODES.MANUAL ? "Manueller Eintrag" : "Entwurf bearbeiten"}
        </span>
        <MinuteEditor
          minute={minute}
          setMinute={setMinute}
          minuteEditing={minuteEditing}
          setMinuteEditing={setMinuteEditing}
          minuteOverride={minuteOverride}
          setMinuteOverride={setMinuteOverride}
          currentMinute={currentMinute}
        />
      </div>

      <div className="lt-editor__input-wrap">
        {/* Command palette */}
        {showPalette && (
          <div className="lt-cmd-palette">
            {filteredCmds.map((c, i) => (
              <div
                key={c.cmd}
                className={`lt-cmd-palette__item${i === paletteIdx ? " lt-cmd-palette__item--active" : ""}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectCmd(c.cmd);
                }}
              >
                <span className="lt-cmd-palette__icon">{c.icon}</span>
                <span className="lt-cmd-palette__cmd">{c.cmd}</span>
                <span className="lt-cmd-palette__desc">{c.desc}</span>
                {c.hint && (
                  <span className="lt-cmd-palette__hint">{c.hint}</span>
                )}
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
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectName(name);
                  }}
                >
                  <span className="lt-cmd-palette__icon">👤</span>
                  <span className="lt-cmd-palette__cmd">
                    {before}
                    <strong>{match}</strong>
                    {after}
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
      {preview && previewDisplay && (
        <div
          className={`lt-editor__preview${!previewDisplay.isFreeTextMode ? " lt-editor__preview--valid" : ""}`}
        >
          <div className="lt-editor__preview-label">
            {!previewDisplay.isFreeTextMode
              ? "✓ Vorschau"
              : `✎ Freitext mit ${preview.meta?.icon ?? "📣"} – Icon wird übernommen`}
          </div>
          <div
            className={`lt-editor__preview-text${!previewDisplay.isFreeTextMode ? " lt-editor__preview-text--valid" : ""}`}
          >
            {preview.meta?.minute ? (
              <span style={{ opacity: 0.6, marginRight: "0.4rem" }}>
                {preview.meta.minute}'
              </span>
            ) : null}
            {preview.meta?.icon && (
              <span style={{ marginRight: "0.35rem" }}>
                {preview.meta.icon}
              </span>
            )}
            {previewDisplay.displayText}
          </div>
          {preview.warnings.map((w, i) => (
            <div key={i} className="lt-editor__preview-warning">
              ⚠ {w}
            </div>
          ))}
        </div>
      )}

      <div className="lt-editor__actions">
        {onCancel && (
          <button className="lt-btn lt-btn--ghost" onClick={onCancel}>
            Abbrechen
          </button>
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
});
