// ============================================================
// SocialPublishModal.jsx — Shared publish modal for social panels
// Used by TwitterPanel and InstagramPanel
// ============================================================

import { useState, useRef } from "react";
import { useCommandPalette, CommandPalettePortal } from "./commandPalette";
import { PUBLISH_PHASES as PHASES, MAX_MATCH_MINUTE } from "../constants";
import { useMediaPublishForm } from "../hooks/useMediaPublishForm";

export function SocialPublishModal({
  post,
  matchId,
  currentMinute,
  onClose,
  onPublished,
  headerIcon,
  headerLabel,
  submitLabel,
  submitBackground,
}) {
  const [text, setText] = useState(post.title ?? "");
  const textareaRef = useRef(null);
  const { minute, setMinute, phase, setPhase, loading, error, submit } =
    useMediaPublishForm(currentMinute);
  const { showPalette, paletteIdx, filteredCmds, onValueChange, selectCmd, handlePaletteKeyDown } =
    useCommandPalette(text);

  async function handleSubmit(e) {
    e?.preventDefault();
    await submit(post.id, matchId, text, onPublished);
  }

  const disabled = loading || !text.trim();

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div style={{
        width: "100%", maxWidth: 440, borderRadius: 10,
        background: "var(--lt-bg-card)", border: "1px solid var(--lt-border)",
        boxShadow: "0 24px 48px rgba(0,0,0,0.7)", overflow: "hidden", position: "relative",
        padding: "1.25rem",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
          <span style={{ fontSize: "1.1rem" }}>{headerIcon}</span>
          <span style={{ fontFamily: "var(--lt-font-mono)", fontSize: "0.7rem", color: "var(--lt-text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {headerLabel}
          </span>
        </div>

        {/* Post-Vorschau */}
        <div style={{
          background: "var(--lt-bg-card-2)", border: "1px solid var(--lt-border)",
          borderRadius: 6, padding: "0.6rem 0.75rem", marginBottom: "0.75rem",
          fontFamily: "var(--lt-font-mono)", fontSize: "0.68rem", color: "var(--lt-text-muted)",
          lineHeight: 1.5, maxHeight: 80, overflow: "hidden",
        }}>
          {post.title}
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {error && (
            <div style={{
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 6, padding: "0.5rem 0.75rem",
              fontFamily: "var(--lt-font-mono)", fontSize: "0.72rem", color: "#f87171",
            }}>
              {error}
            </div>
          )}

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <label style={{ fontFamily: "var(--lt-font-mono)", fontSize: "0.65rem", color: "var(--lt-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Ticker-Text
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <select
                  value={phase}
                  onChange={(e) => setPhase(e.target.value)}
                  style={{
                    background: "var(--lt-bg-input)", border: "1px solid var(--lt-border)",
                    borderRadius: 4, padding: "2px 4px",
                    fontFamily: "var(--lt-font-mono)", fontSize: "0.62rem",
                    color: "var(--lt-text)", outline: "none",
                  }}
                >
                  {PHASES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
                {!phase && (
                  <input
                    type="number"
                    value={minute}
                    min={0} max={MAX_MATCH_MINUTE}
                    onChange={(e) => setMinute(Number(e.target.value))}
                    style={{
                      width: 46, background: "var(--lt-bg-input)", border: "1px solid var(--lt-border)",
                      borderRadius: 4, padding: "2px 4px",
                      fontFamily: "var(--lt-font-mono)", fontSize: "0.78rem",
                      color: "var(--lt-text)", outline: "none", textAlign: "center",
                    }}
                  />
                )}
              </div>
            </div>
            <CommandPalettePortal
              show={showPalette}
              items={filteredCmds}
              activeIdx={paletteIdx}
              anchorRef={textareaRef}
              onSelect={(cmd) => { selectCmd(cmd, setText); setTimeout(() => textareaRef.current?.focus(), 0); }}
            />
            <textarea
              ref={textareaRef}
              autoFocus
              placeholder="Ticker-Eintrag …"
              value={text}
              onChange={(e) => { setText(e.target.value); onValueChange(e.target.value); }}
              onKeyDown={(e) => {
                if (handlePaletteKeyDown(e, setText)) return;
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
              }}
              rows={4}
              style={{
                width: "100%", boxSizing: "border-box", resize: "none",
                background: "var(--lt-bg-input)", border: "1px solid var(--lt-border)",
                borderRadius: 6, padding: "0.6rem 0.75rem",
                fontFamily: "var(--lt-font-mono)", fontSize: "0.82rem",
                color: "var(--lt-text)", lineHeight: 1.5, outline: "none",
              }}
              onFocus={(e) => e.target.style.borderColor = "var(--lt-accent)"}
              onBlur={(e) => e.target.style.borderColor = "var(--lt-border)"}
            />
            <div style={{ fontFamily: "var(--lt-font-mono)", fontSize: "0.65rem", color: "var(--lt-text-faint)", marginTop: 3 }}>
              <span style={{ color: "var(--lt-accent)" }}>↵</span> Veröffentlichen · <span style={{ color: "var(--lt-accent)" }}>/?</span> alle Commands
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1, padding: "0.6rem", borderRadius: 6, border: "1px solid var(--lt-border)",
                background: "transparent", color: "var(--lt-text-muted)",
                fontFamily: "var(--lt-font-mono)", fontSize: "0.8rem", cursor: "pointer",
              }}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={disabled}
              style={{
                flex: 2, padding: "0.6rem", borderRadius: 6, border: "none",
                background: disabled ? "var(--lt-bg-card-2)" : submitBackground,
                color: disabled ? "var(--lt-text-faint)" : "#fff",
                fontFamily: "var(--lt-font-mono)", fontSize: "0.8rem", fontWeight: 700,
                cursor: disabled ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Publiziere…" : submitLabel}
            </button>
          </div>
        </form>

        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 8, right: 8,
            width: 28, height: 28, borderRadius: "50%",
            background: "rgba(0,0,0,0.5)", border: "1px solid var(--lt-border)",
            color: "var(--lt-text-muted)", cursor: "pointer", fontSize: "0.75rem",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >✕</button>
      </div>
    </div>
  );
}
