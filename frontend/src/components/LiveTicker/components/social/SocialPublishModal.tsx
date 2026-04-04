// ============================================================
// SocialPublishModal.jsx — Shared publish modal for social panels
// Used by TwitterPanel and InstagramPanel
// ============================================================

import { useState, useRef, type FormEvent } from "react";
import { useCommandPalette, CommandPalettePortal } from "../entry/CommandPalette";
import { PUBLISH_PHASES as PHASES, MAX_MATCH_MINUTE } from "../../constants";
import { useMediaPublishForm } from "../../hooks/useMediaPublishForm";
import { PublishModalShell } from "../PublishModalShell";

interface SocialPublishModalProps {
  post: { id: number | string; title?: string | null };
  matchId: number;
  currentMinute: number;
  onClose: () => void;
  onPublished: (id: number | string) => void;
  headerIcon: string;
  headerLabel: string;
  submitLabel: string;
  submitBackground: string;
}

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
}: SocialPublishModalProps) {
  const [text, setText] = useState(post.title ?? "");
  const textareaRef = useRef(null);
  const { minute, setMinute, phase, setPhase, loading, error, submit } =
    useMediaPublishForm(currentMinute);
  const {
    showPalette,
    paletteIdx,
    filteredCmds,
    onValueChange,
    selectCmd,
    handlePaletteKeyDown,
  } = useCommandPalette(text);

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    await submit(post.id, matchId, text, onPublished);
  }

  const disabled = loading || !text.trim();

  const hintNode = (
    <div
      style={{
        fontFamily: "var(--lt-font-mono)",
        fontSize: "0.65rem",
        color: "var(--lt-text-faint)",
        marginTop: 3,
      }}
    >
      <span style={{ color: "var(--lt-accent)" }}>↵</span>{" "}
      Veröffentlichen ·{" "}
      <span style={{ color: "var(--lt-accent)" }}>/?</span> alle
      Commands
    </div>
  );

  return (
    <PublishModalShell
      onClose={onClose}
      onSubmit={handleSubmit}
      error={error}
      text={text}
      onTextChange={(v) => {
        setText(v);
        onValueChange(v);
      }}
      textareaRef={textareaRef}
      onKeyDown={(e) => {
        if (handlePaletteKeyDown(e, setText)) return;
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          handleSubmit();
        }
      }}
      submitLabel={submitLabel}
      submitDisabled={disabled}
      submitting={loading}
      submitStyle={
        disabled ? undefined : { background: submitBackground, color: "#fff" }
      }
      preview={
        <div style={{ padding: "1rem 1rem 0" }}>
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "1rem",
            }}
          >
            <span style={{ fontSize: "1.1rem" }}>{headerIcon}</span>
            <span
              style={{
                fontFamily: "var(--lt-font-mono)",
                fontSize: "0.7rem",
                color: "var(--lt-text-muted)",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              {headerLabel}
            </span>
          </div>

          {/* Post-Vorschau */}
          <div
            style={{
              background: "var(--lt-bg-card-2)",
              border: "1px solid var(--lt-border)",
              borderRadius: 6,
              padding: "0.6rem 0.75rem",
              fontFamily: "var(--lt-font-mono)",
              fontSize: "0.68rem",
              color: "var(--lt-text-muted)",
              lineHeight: 1.5,
              maxHeight: 80,
              overflow: "hidden",
            }}
          >
            {post.title}
          </div>
        </div>
      }
      extraControls={
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <select
            value={phase}
            onChange={(e) => setPhase(e.target.value)}
            className="lt-form-input"
          >
            {PHASES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          {!phase && (
            <input
              type="number"
              value={minute}
              min={0}
              max={MAX_MATCH_MINUTE}
              onChange={(e) => setMinute(Number(e.target.value))}
              className="lt-form-input"
              style={{
                width: 46,
                fontSize: "0.78rem",
                textAlign: "center",
              }}
            />
          )}
        </div>
      }
      hintContent={hintNode}
    >
      <CommandPalettePortal
        show={showPalette}
        items={filteredCmds}
        activeIdx={paletteIdx}
        anchorRef={textareaRef}
        onSelect={(cmd) => {
          selectCmd(cmd, setText);
          setTimeout(() => textareaRef.current?.focus(), 0);
        }}
      />
    </PublishModalShell>
  );
}
