import { useState, useRef, useEffect, useCallback } from "react";
import { StylePickerDropdown } from "../StylePickerDropdown";
import type { TickerEntry, TickerStyle } from "../../../../types";

interface SummaryDraftCardProps {
  draft: TickerEntry;
  label?: string;
  onPublish: (text: string) => void;
  onReject: () => void;
  onGenerate?: (id: number, style: TickerStyle) => void;
  generatingId?: string | number | null;
}

export function SummaryDraftCard({
  draft,
  label = "KI-Text",
  onPublish,
  onReject,
  onGenerate,
  generatingId,
}: SummaryDraftCardProps) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(draft.text ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isGenerating = generatingId === "regenerating";

  // Auto-resize textarea to fit content
  useEffect(() => {
    if (editing && textareaRef.current) {
      const el = textareaRef.current;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [editing, text]);

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (editing) {
      textareaRef.current?.focus();
      const len = textareaRef.current?.value.length ?? 0;
      textareaRef.current?.setSelectionRange(len, len);
    }
  }, [editing]);

  const handleAccept = useCallback(() => {
    onPublish(text);
  }, [onPublish, text]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setEditing(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleAccept();
      }
      if (e.key === "Tab") {
        e.preventDefault();
        handleAccept();
      }
    },
    [handleAccept],
  );

  // Edit mode: full editor view, no draft frame
  if (editing) {
    return (
      <div className="lt-summary-editor" style={{ marginBottom: "0.5rem" }}>
        <div className="lt-editor__toolbar">
          <span className="lt-editor__label">✎ {label} bearbeiten</span>

        </div>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          className="lt-entry__edit-textarea"
          style={{
            width: "100%",
            minHeight: 120,
            resize: "vertical",
            display: "block",
          }}
        />
        <div className="lt-entry__edit-actions" style={{ marginTop: "0.5rem" }}>
          <button className="lt-btn lt-btn--primary lt-btn--sm" onClick={handleAccept}>
            Annehmen <kbd className="lt-btn__kbd">⌘↵</kbd>
          </button>
          <button
            className="lt-btn lt-btn--ghost lt-btn--sm"
            onClick={() => setEditing(false)}
          >
            Abbrechen <kbd className="lt-btn__kbd">Esc</kbd>
          </button>
        </div>
      </div>
    );
  }

  // View mode: draft card
  return (
    <div
      className="lt-draft"
      style={{ marginBottom: "0.5rem", position: "relative" }}
    >
      <div className="lt-draft__header">
        <span style={{ fontSize: "0.9rem" }}>{draft.icon ?? "✦"}</span>
        <span className="lt-draft__label">{label}</span>
      </div>
      <div className="lt-draft__text-wrap">
        <p
          className="lt-draft__text"
          style={{ cursor: "text" }}
          onClick={() => setEditing(true)}
          title="Klicken zum Bearbeiten"
        >
          {text || "Generiere Text…"}
        </p>
      </div>
      <div className="lt-draft__actions">
        <button
          className="lt-btn lt-btn--primary"
          onClick={() => onPublish(text)}
        >
          Annehmen <kbd className="lt-btn__kbd">TAB</kbd>
        </button>
        <button className="lt-btn lt-btn--ghost" onClick={onReject}>
          Ablehnen <kbd className="lt-btn__kbd">ESC</kbd>
        </button>
        <button
          className="lt-btn lt-btn--ghost"
          onClick={() => setEditing(true)}
        >
          ✎ Bearbeiten
        </button>
        {onGenerate && (
          <StylePickerDropdown
            onSelect={(s) => onGenerate(draft.id, s)}
            disabled={isGenerating}
          />
        )}
      </div>
    </div>
  );
}
