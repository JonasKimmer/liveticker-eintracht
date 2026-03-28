// ============================================================
// SocialPublishModal.jsx — Shared publish modal for social panels
// Used by TwitterPanel and InstagramPanel
// ============================================================

import { useState, useRef } from "react";
import { useCommandPalette, CommandPalettePortal } from "./CommandPalette";
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
}: any) {
  const [text, setText] = useState(post.title ?? "");
  const textareaRef = useRef(null);
  const { minute, setMinute, phase, setPhase, loading, error, submit } =
    useMediaPublishForm(currentMinute);
  const { showPalette, paletteIdx, filteredCmds, onValueChange, selectCmd, handlePaletteKeyDown } =
    useCommandPalette(text);

  async function handleSubmit(e?: any) {
    e?.preventDefault();
    await submit(post.id, matchId, text, onPublished);
  }

  const disabled = loading || !text.trim();

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="lt-modal-overlay"
    >
      <div className="lt-modal-card" style={{ padding: "1.25rem" }}>
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
            <div className="lt-msg-error">
              {error}
            </div>
          )}

          <div>
            <div className="lt-row-between" style={{ marginBottom: 4 }}>
              <label style={{ fontFamily: "var(--lt-font-mono)", fontSize: "0.65rem", color: "var(--lt-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Ticker-Text
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <select
                  value={phase}
                  onChange={(e) => setPhase(e.target.value)}
                  className="lt-form-input"
                >
                  {PHASES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
                {!phase && (
                  <input
                    type="number"
                    value={minute}
                    min={0} max={MAX_MATCH_MINUTE}
                    onChange={(e) => setMinute(Number(e.target.value))}
                    className="lt-form-input"
                    style={{ width: 46, fontSize: "0.78rem", textAlign: "center" }}
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
              className="lt-form-textarea"
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
              className="lt-btn-secondary"
              style={{ flex: 1 }}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={disabled}
              className="lt-btn-primary"
              style={{ flex: 2, background: disabled ? "var(--lt-bg-card-2)" : submitBackground, color: disabled ? "var(--lt-text-faint)" : "#fff" }}
            >
              {loading ? "Publiziere…" : submitLabel}
            </button>
          </div>
        </form>

        <button
          onClick={onClose}
          className="lt-modal-close"
        >✕</button>
      </div>
    </div>
  );
}
