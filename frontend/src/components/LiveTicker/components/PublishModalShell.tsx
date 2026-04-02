// ============================================================
// PublishModalShell — Shared structural wrapper for publish modals
// Provides: overlay, card, close button, form layout, textarea,
//           label row, hint, and cancel/submit buttons.
// ============================================================

import {
  type FormEvent,
  type ReactNode,
  type RefObject,
  type CSSProperties,
  type KeyboardEvent,
} from "react";

interface PublishModalShellProps {
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  error: string | null;
  // Textarea
  text: string;
  onTextChange: (text: string) => void;
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
  textareaPlaceholder?: string;
  textareaDisabled?: boolean;
  textareaStyle?: CSSProperties;
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  // Buttons
  submitLabel: string;
  submitDisabled?: boolean;
  submitting?: boolean;
  submitStyle?: CSSProperties;
  // Slots
  preview?: ReactNode;
  labelExtra?: ReactNode;
  extraControls?: ReactNode;
  children?: ReactNode;
  hintContent?: ReactNode;
  // Card
  cardStyle?: CSSProperties;
}

export function PublishModalShell({
  onClose,
  onSubmit,
  error,
  text,
  onTextChange,
  textareaRef,
  textareaPlaceholder = "Ticker-Eintrag …",
  textareaDisabled,
  textareaStyle,
  onKeyDown,
  submitLabel,
  submitDisabled,
  submitting,
  submitStyle,
  preview,
  labelExtra,
  extraControls,
  children,
  hintContent,
  cardStyle,
}: PublishModalShellProps) {
  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="lt-modal-overlay"
    >
      <div className="lt-modal-card" style={cardStyle}>
        {preview}

        <form
          onSubmit={onSubmit}
          style={{
            padding: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          {error && <div className="lt-msg-error">{error}</div>}

          <div>
            <div className="lt-row-between" style={{ marginBottom: 4 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <label className="lt-mono-label">
                  Ticker-Text
                </label>
                {labelExtra}
              </div>
              {extraControls}
            </div>

            <div style={{ position: "relative" }}>
              {children}
              <textarea
                ref={textareaRef}
                autoFocus
                placeholder={textareaPlaceholder}
                value={text}
                onChange={(e) => onTextChange(e.target.value)}
                onKeyDown={onKeyDown}
                disabled={textareaDisabled}
                rows={4}
                className="lt-form-textarea lt-publish-textarea"
                style={textareaStyle}
              />
            </div>

            {hintContent !== undefined ? (
              hintContent
            ) : (
              <div
                style={{
                  fontFamily: "var(--lt-font-mono)",
                  fontSize: "0.65rem",
                  color: "var(--lt-text-faint)",
                  marginTop: 3,
                }}
              >
                <span style={{ color: "var(--lt-accent)" }}>Ctrl+↵</span>{" "}
                Veröffentlichen
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: "0.5rem", paddingTop: 4 }}>
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
              disabled={submitDisabled}
              className="lt-btn-primary"
              style={{ flex: 2, ...submitStyle }}
            >
              {submitting ? "Publiziere…" : submitLabel}
            </button>
          </div>
        </form>

        <button onClick={onClose} className="lt-modal-close">
          ✕
        </button>
      </div>
    </div>
  );
}
