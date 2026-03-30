import { useState, useCallback, useRef, useMemo, useEffect, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useLiveMinuteEditor } from "../hooks/useLiveMinuteEditor";
import { generateMediaCaption, publishMedia } from "api";
import { parseCommand } from "../utils/parseCommand";
import { useCommandPalette, CommandPalettePortal } from "./CommandPalette";
import { MinuteEditor } from "./MinuteEditor";
import { useNameAutocomplete } from "hooks/useNameAutocomplete";

interface MediaPublishModalProps {
  image: { media_id: string | number; thumbnail_url?: string | null; name?: string | null };
  matchId: number;
  onClose: () => void;
  onPublished: (mediaId: string | number) => void;
  playerNames?: string[];
  currentMinute?: number;
}

export function MediaPublishModal({ image, matchId, onClose, onPublished, playerNames = [], currentMinute = 0 }: MediaPublishModalProps) {
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const textareaRef = useRef(null);

  // Live minute — syncs from prop, ticks every 60s, can be manually overridden
  const { minute, setMinute, minuteEditing, setMinuteEditing, minuteOverride, setMinuteOverride } = useLiveMinuteEditor(currentMinute);

  const { showPalette, paletteIdx, filteredCmds, onValueChange, selectCmd: selectCmdPalette, handlePaletteKeyDown } = useCommandPalette(description);
  const preview = useMemo(() => {
    if (!description.trim().startsWith("/")) return null;
    return parseCommand(description.trim(), minute);
  }, [description, minute]);

  const { lastWord, nameSuggestions, showNames, nameIdx, setNameIdx, selectName } = useNameAutocomplete(
    description, playerNames, { showPalette, onReplace: setDescription, inputRef: textareaRef },
  );
  useEffect(() => { textareaRef.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && !showPalette && !showNames) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, showPalette, showNames]);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await generateMediaCaption(image.media_id);
      setDescription(res.data.text);
      textareaRef.current?.focus();
    } catch {
      setError("KI-Generierung fehlgeschlagen.");
    } finally {
      setGenerating(false);
    }
  }, [image.media_id]);

  const handleChange = useCallback((e) => {
    const v = e.target.value;
    setDescription(v);
    onValueChange(v);
  }, [onValueChange]);

  const handleSubmit = useCallback(async (e?: FormEvent) => {
    e?.preventDefault();
    if (!description.trim()) { setError("Text darf nicht leer sein."); return; }
    const raw = description.trim();
    let textToPublish = raw;
    let icon = null;
    if (raw.startsWith("/")) {
      const parsed = parseCommand(raw, minute);
      icon = parsed.meta?.icon ?? null;
      textToPublish = raw.replace(/^\/\w+\s*/, "").trim() || raw;
    }
    setLoading(true);
    setError(null);
    try {
      await publishMedia({ mediaId: image.media_id, description: textToPublish, matchId, minute: minute || null, icon });
      onPublished(image.media_id);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
      setLoading(false);
    }
  }, [description, minute, image.media_id, matchId, onPublished]);

  const handleKeyDown = useCallback((e) => {
    if (handlePaletteKeyDown(e, setDescription)) return;
    if (showNames) {
      if (e.key === "ArrowDown") { e.preventDefault(); setNameIdx((i) => Math.min(i + 1, nameSuggestions.length - 1)); return; }
      if (e.key === "ArrowUp")   { e.preventDefault(); setNameIdx((i) => Math.max(i - 1, 0)); return; }
      if (e.key === "Tab" || e.key === "Enter") { if (nameSuggestions[nameIdx]) { e.preventDefault(); selectName(nameSuggestions[nameIdx]); return; } }
      if (e.key === "Escape") { return; }
    }
    if (e.key === "Enter" && !e.ctrlKey && !e.shiftKey && description.trim().startsWith("/")) {
      if (preview?.isValid) { e.preventDefault(); setDescription(preview.formatted); }
      return;
    }
    if (e.ctrlKey && e.key === "Enter") { e.preventDefault(); handleSubmit(); }
  }, [handlePaletteKeyDown, showNames, nameSuggestions, nameIdx, description, preview, selectName, handleSubmit]);

  const publishDisabled = loading || !description.trim();

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="lt-modal-overlay"
      style={{ zIndex: 100, background: "rgba(0,0,0,0.75)" }}
    >
      <div className="lt-modal-card" style={{ maxWidth: 420, boxShadow: "0 24px 48px rgba(0,0,0,0.6)" }}>
        {/* Bild Preview */}
        {image.thumbnail_url && (
          <div style={{ position: "relative", aspectRatio: "16/7", overflow: "hidden" }}>
            <img
              src={image.thumbnail_url}
              alt={image.name}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(to top, var(--lt-bg-card) 0%, transparent 60%)",
            }} />
            <span style={{
              position: "absolute", bottom: 8, left: 12,
              fontFamily: "var(--lt-font-mono)", fontSize: "0.65rem",
              color: "var(--lt-text-muted)", maxWidth: "80%",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {image.name || `media_id: ${image.media_id}`}
            </span>
          </div>
        )}

        {/* Formular */}
        <form onSubmit={handleSubmit} style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {error && (
            <div className="lt-msg-error">
              {error}
            </div>
          )}

          <div>
            {/* Label row with live minute */}
            <div className="lt-row-between" style={{ marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <label style={{ fontFamily: "var(--lt-font-mono)", fontSize: "0.65rem", color: "var(--lt-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Ticker-Text
                </label>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={generating}
                  style={{ fontFamily: "var(--lt-font-mono)", fontSize: "0.62rem", color: "var(--lt-accent)", background: "none", border: "none", cursor: generating ? "not-allowed" : "pointer", padding: 0, opacity: generating ? 0.5 : 1 }}
                >
                  {generating ? "…" : "✦ KI-Text"}
                </button>
              </div>
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

            {/* Textarea with dropdowns */}
            <div style={{ position: "relative" }}>
              {/* Command palette */}
              <CommandPalettePortal
                show={showPalette}
                items={filteredCmds}
                activeIdx={paletteIdx}
                anchorRef={textareaRef}
                onSelect={(cmd) => { selectCmdPalette(cmd, setDescription); setTimeout(() => textareaRef.current?.focus(), 0); }}
              />

              {/* Name suggestions */}
              {showNames && (
                <div className="lt-cmd-palette lt-name-palette">
                  {nameSuggestions.map((name, i) => {
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
                placeholder="Ticker-Eintrag …"
                value={generating ? "✦ Generiere…" : description}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                disabled={generating}
                rows={4}
                className="lt-form-textarea"
                style={{ color: generating ? "var(--lt-text-muted)" : "var(--lt-text)" }}
                onFocus={(e) => (e.currentTarget as HTMLElement).style.borderColor = "var(--lt-accent)"}
                onBlur={(e) => (e.currentTarget as HTMLElement).style.borderColor = "var(--lt-border)"}
              />
            </div>

            {!description && (
              <div style={{ fontFamily: "var(--lt-font-mono)", fontSize: "0.65rem", color: "var(--lt-text-faint)", marginTop: 4 }}>
                <span style={{ color: "var(--lt-accent)" }}>↵</span> Veröffentlichen · <span style={{ color: "var(--lt-accent)" }}>/?</span> alle Commands
              </div>
            )}

          </div>

          <div style={{ display: "flex", gap: "0.5rem", paddingTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
              className="lt-btn-secondary"
              style={{ flex: 1, transition: "all 0.15s" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--lt-bg-card-2)"; (e.currentTarget as HTMLElement).style.color = "var(--lt-text)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--lt-text-muted)"; }}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={publishDisabled}
              className="lt-btn-primary"
              style={{ flex: 2, transition: "all 0.15s", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
            >
              {loading ? (
                <>
                  <svg style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }} />
                    <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" style={{ opacity: 0.75 }} />
                  </svg>
                  Publiziere...
                </>
              ) : (
                <>✓ Im Ticker veröffentlichen</>
              )}
            </button>
          </div>
        </form>

        {/* X */}
        <button
          onClick={onClose}
          className="lt-modal-close"
          style={{ transition: "all 0.15s" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--lt-bg-card-2)"; (e.currentTarget as HTMLElement).style.color = "var(--lt-text)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.5)"; (e.currentTarget as HTMLElement).style.color = "var(--lt-text-muted)"; }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
