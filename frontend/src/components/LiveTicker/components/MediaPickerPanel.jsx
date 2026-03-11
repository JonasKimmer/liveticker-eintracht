// ============================================================
// MediaPickerPanel.jsx — ScorePlay Bilder für Redakteure
// Design: lt- CSS-Variablen (passt zum bestehenden System)
// Flow: Bilder laden → Doppelklick → Modal → Veröffentlichen
// ============================================================

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useMediaWebSocket } from "../../../hooks/useMediaWebSocket";
import { generateMediaCaption } from "../../../api";
import { parseCommand } from "../utils/parseCommand";
import config from "../../../config/whitelabel";

const API_BASE = config.apiBase;

const COMMAND_PALETTE = [
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
  { cmd: "/abpfiff",  desc: "Abpfiff",                icon: "📣", hint: "" },
];
const N8N_WEBHOOK = `${config.n8nBase}/scoreplay-media`;

// ── API ──────────────────────────────────────────────────────

async function fetchQueue() {
  const res = await fetch(`${API_BASE}/media/queue`);
  if (!res.ok) throw new Error(`Queue laden fehlgeschlagen (${res.status})`);
  return res.json();
}

async function triggerN8nWebhook(playerId) {
  const body = playerId ? { player_id: Number(playerId) } : {};
  const res = await fetch(N8N_WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`n8n Webhook fehlgeschlagen (${res.status})`);
}

async function publishMedia({ mediaId, description, matchId, minute }) {
  const res = await fetch(`${API_BASE}/media/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      media_id: mediaId,
      description,
      match_id: matchId,
      minute: minute ? Number(minute) : null,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Veröffentlichen fehlgeschlagen (${res.status})`);
  }
  return res.json();
}

// ── Publish Modal ─────────────────────────────────────────────

function PublishModal({ image, matchId, onClose, onPublished, playerNames = [], currentMinute = 0 }) {
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const textareaRef = useRef(null);
  const minuteRef = useRef(null);

  // Live minute
  const [minute, setMinute] = useState(currentMinute);
  const [minuteEditing, setMinuteEditing] = useState(false);
  const [minuteOverride, setMinuteOverride] = useState(false);

  useEffect(() => { if (!minuteOverride) setMinute(currentMinute); }, [currentMinute, minuteOverride]);
  useEffect(() => {
    if (minuteOverride || minute === 0) return;
    const id = setInterval(() => setMinute((m) => m + 1), 60000);
    return () => clearInterval(id);
  }, [minuteOverride, minute]);

  // Command palette
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteIdx, setPaletteIdx] = useState(0);
  const [nameIdx, setNameIdx] = useState(0);

  const cmdToken = description.startsWith("/") && !description.includes(" ")
    ? description.toLowerCase()
    : description === "/" ? "/" : null;

  const filteredCmds = useMemo(() => {
    if (!cmdToken) return [];
    const items = COMMAND_PALETTE.filter(Boolean);
    if (cmdToken === "/") return items;
    return items.filter((c) => c.cmd.startsWith(cmdToken));
  }, [cmdToken]);

  const showPalette = paletteOpen && filteredCmds.length > 0;

  const preview = useMemo(() => {
    if (!description.trim().startsWith("/")) return null;
    return parseCommand(description.trim(), minute);
  }, [description, minute]);

  const lastWord = useMemo(() => {
    if (description.startsWith("/") && !description.includes(" ")) return "";
    const words = description.split(/\s+/);
    return words[words.length - 1] ?? "";
  }, [description]);

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

  useEffect(() => { setNameIdx(0); }, [nameSuggestions]);
  useEffect(() => { textareaRef.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && !showPalette && !showNames) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, showPalette, showNames]);

  const selectCmd = (cmd) => {
    const needsArg = ["/anpfiff", "/2hz", "/vz1", "/vz2", "/g", "/og", "/gelb", "/rot", "/ep", "/s", "/n"].includes(cmd);
    setDescription(cmd + (needsArg ? " " : ""));
    setPaletteOpen(false);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const selectName = (name) => {
    const words = description.split(/\s+/);
    words[words.length - 1] = name;
    setDescription(words.join(" ") + " ");
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await generateMediaCaption(image.media_id);
      setDescription(res.data.text);
      textareaRef.current?.focus();
    } catch (err) {
      setError("KI-Generierung fehlgeschlagen.");
    } finally {
      setGenerating(false);
    }
  }

  function handleChange(e) {
    const v = e.target.value;
    setDescription(v);
    if (v.startsWith("/") && !v.includes(" ")) {
      setPaletteOpen(true);
      setPaletteIdx(0);
    } else {
      setPaletteOpen(false);
    }
  }

  function handleKeyDown(e) {
    if (showPalette) {
      if (e.key === "ArrowDown") { e.preventDefault(); setPaletteIdx((i) => Math.min(i + 1, filteredCmds.length - 1)); return; }
      if (e.key === "ArrowUp")   { e.preventDefault(); setPaletteIdx((i) => Math.max(i - 1, 0)); return; }
      if (e.key === "Tab" || e.key === "Enter") { e.preventDefault(); if (filteredCmds[paletteIdx]) selectCmd(filteredCmds[paletteIdx].cmd); return; }
      if (e.key === "Escape") { setPaletteOpen(false); return; }
    }
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
  }

  async function handleSubmit(e) {
    e?.preventDefault();
    let textToPublish = description.trim();
    if (!textToPublish) { setError("Text darf nicht leer sein."); return; }
    if (textToPublish.startsWith("/")) {
      if (!preview?.isValid) { setError("Befehl unvollständig."); return; }
      textToPublish = preview.formatted;
    }
    setLoading(true);
    setError(null);
    try {
      await publishMedia({ mediaId: image.media_id, description: textToPublish, matchId, minute: minute || null });
      onPublished(image.media_id);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  const publishDisabled = loading || !description.trim() ||
    (description.trim().startsWith("/") && !!preview && !preview.isValid);

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div style={{
        width: "100%", maxWidth: 420, borderRadius: 10,
        background: "var(--lt-bg-card)", border: "1px solid var(--lt-border)",
        boxShadow: "0 24px 48px rgba(0,0,0,0.6)", overflow: "hidden", position: "relative",
      }}>
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
            <div style={{
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 6, padding: "0.5rem 0.75rem",
              fontFamily: "var(--lt-font-mono)", fontSize: "0.72rem", color: "#f87171",
            }}>
              {error}
            </div>
          )}

          <div>
            {/* Label row with live minute */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
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
              <div className="lt-editor__minute">
                {minuteEditing ? (
                  <input
                    ref={minuteRef}
                    type="number"
                    className="lt-editor__minute-input"
                    value={minute}
                    min={0} max={120}
                    onChange={(e) => { setMinute(Number(e.target.value)); setMinuteOverride(true); }}
                    onBlur={() => setMinuteEditing(false)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") setMinuteEditing(false); }}
                    autoFocus
                  />
                ) : (
                  <button
                    type="button"
                    className={`lt-editor__minute-btn${minuteOverride ? " lt-editor__minute-btn--manual" : ""}`}
                    onClick={() => setMinuteEditing(true)}
                    title={minuteOverride ? "Manuell gesetzt – klicken zum Ändern" : "Live-Minute – klicken zum Überschreiben"}
                  >
                    {minute > 0 ? `${minute}'` : "–'"}
                    {!minuteOverride && <span className="lt-editor__minute-live" />}
                  </button>
                )}
                {minuteOverride && (
                  <button
                    type="button"
                    className="lt-editor__minute-reset"
                    onClick={() => { setMinuteOverride(false); setMinute(currentMinute); }}
                    title="Auf Live-Minute zurücksetzen"
                  >↺</button>
                )}
              </div>
            </div>

            {/* Textarea with dropdowns */}
            <div style={{ position: "relative" }}>
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
                placeholder="/ für Commands  ·  Spielername tippen für Vorschläge"
                value={generating ? "✦ Generiere…" : description}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                disabled={generating}
                rows={4}
                style={{
                  width: "100%", boxSizing: "border-box", resize: "none",
                  background: "var(--lt-bg-input)", border: "1px solid var(--lt-border)",
                  borderRadius: 6, padding: "0.6rem 0.75rem",
                  fontFamily: "var(--lt-font-mono)", fontSize: "0.82rem",
                  color: generating ? "var(--lt-text-muted)" : "var(--lt-text)", lineHeight: 1.5,
                  outline: "none", transition: "border-color 0.15s",
                }}
                onFocus={(e) => e.target.style.borderColor = "var(--lt-accent)"}
                onBlur={(e) => e.target.style.borderColor = "var(--lt-border)"}
              />
            </div>

            {!description && (
              <div style={{ fontFamily: "var(--lt-font-mono)", fontSize: "0.65rem", color: "var(--lt-text-faint)", marginTop: 4 }}>
                <span style={{ color: "var(--lt-accent)" }}>/</span> Commands · Spielername Autocomplete · <span style={{ color: "var(--lt-accent)" }}>↵</span> Vorschau · <span style={{ color: "var(--lt-accent)" }}>Ctrl+↵</span> Veröffentlichen
              </div>
            )}

            {/* Preview */}
            {preview && (
              <div style={{
                marginTop: 6, padding: "0.4rem 0.6rem", borderRadius: 5,
                background: preview.isValid ? "rgba(16,185,129,0.08)" : "rgba(245,158,11,0.08)",
                border: `1px solid ${preview.isValid ? "rgba(16,185,129,0.25)" : "rgba(245,158,11,0.25)"}`,
                fontFamily: "var(--lt-font-mono)", fontSize: "0.72rem",
                color: preview.isValid ? "var(--lt-text)" : "var(--lt-text-muted)",
              }}>
                <span style={{ opacity: 0.6, fontSize: "0.62rem" }}>{preview.isValid ? "✓ " : "⚠ "}</span>
                {preview.meta?.minute ? <span style={{ opacity: 0.6, marginRight: "0.3rem" }}>{preview.meta.minute}'</span> : null}
                {preview.meta?.icon && <span style={{ marginRight: "0.3rem" }}>{preview.meta.icon}</span>}
                {preview.formatted}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: "0.5rem", paddingTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1, padding: "0.6rem", borderRadius: 6, border: "1px solid var(--lt-border)",
                background: "transparent", color: "var(--lt-text-muted)",
                fontFamily: "var(--lt-font-mono)", fontSize: "0.8rem", cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { e.target.style.background = "var(--lt-bg-card-2)"; e.target.style.color = "var(--lt-text)"; }}
              onMouseLeave={(e) => { e.target.style.background = "transparent"; e.target.style.color = "var(--lt-text-muted)"; }}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={publishDisabled}
              style={{
                flex: 2, padding: "0.6rem", borderRadius: 6, border: "none",
                background: !publishDisabled ? "var(--lt-accent)" : "var(--lt-bg-card-2)",
                color: !publishDisabled ? "#0d0d0d" : "var(--lt-text-faint)",
                fontFamily: "var(--lt-font-mono)", fontSize: "0.8rem", fontWeight: 700,
                cursor: !publishDisabled ? "pointer" : "not-allowed",
                transition: "all 0.15s", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
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
          style={{
            position: "absolute", top: 8, right: 8,
            width: 28, height: 28, borderRadius: "50%",
            background: "rgba(0,0,0,0.5)", border: "1px solid var(--lt-border)",
            color: "var(--lt-text-muted)", cursor: "pointer", fontSize: "0.75rem",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => { e.target.style.background = "var(--lt-bg-card-2)"; e.target.style.color = "var(--lt-text)"; }}
          onMouseLeave={(e) => { e.target.style.background = "rgba(0,0,0,0.5)"; e.target.style.color = "var(--lt-text-muted)"; }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ── Thumbnail Kachel ──────────────────────────────────────────

function MediaThumbnail({ item, onDoubleClick }) {
  const [hovered, setHovered] = useState(false);
  const [previewStyle, setPreviewStyle] = useState(null);
  const btnRef = useRef(null);

  function handleMouseEnter() {
    setHovered(true);
    if (btnRef.current && item.thumbnail_url) {
      const r = btnRef.current.getBoundingClientRect();
      const spaceRight = window.innerWidth - r.right;
      const previewW = 320;
      const left = spaceRight >= previewW + 16 ? r.right + 8 : r.left - previewW - 8;
      const top = Math.min(r.top, window.innerHeight - 220);
      setPreviewStyle({ position: "fixed", top, left, width: previewW, zIndex: 9999 });
    }
  }

  function handleMouseLeave() {
    setHovered(false);
    setPreviewStyle(null);
  }

  return (
    <>
      <button
        ref={btnRef}
        onDoubleClick={() => onDoubleClick(item)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        title="Doppelklick zum Veröffentlichen"
        style={{
          position: "relative", overflow: "hidden", borderRadius: 6,
          border: `1px solid ${hovered ? "var(--lt-accent)" : "var(--lt-border)"}`,
          background: "var(--lt-bg-card-2)", cursor: "pointer", padding: 0,
          aspectRatio: "16/9", display: "block", width: "100%",
          transition: "border-color 0.15s", outline: "none",
        }}
      >
        {item.thumbnail_url ? (
          <img
            src={item.thumbnail_url}
            alt={item.name || "Bild"}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            loading="lazy"
          />
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", color: "var(--lt-text-faint)", fontFamily: "var(--lt-font-mono)", fontSize: "0.65rem" }}>
            kein Vorschaubild
          </div>
        )}
        {hovered && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: "var(--lt-font-mono)", fontSize: "0.65rem", fontWeight: 700, color: "var(--lt-accent)", background: "rgba(0,0,0,0.6)", padding: "3px 8px", borderRadius: 4, letterSpacing: "0.05em" }}>
              DOPPELKLICK
            </span>
          </div>
        )}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.7))", padding: "10px 6px 4px" }}>
          <p style={{ fontFamily: "var(--lt-font-mono)", fontSize: "0.6rem", color: "var(--lt-text-muted)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {item.name || `ID ${item.media_id}`}
          </p>
        </div>
      </button>

      {previewStyle && createPortal(
        <div style={{ ...previewStyle, borderRadius: 8, overflow: "hidden", boxShadow: "0 16px 48px rgba(0,0,0,0.7)", border: "1px solid var(--lt-border)", pointerEvents: "none" }}>
          <img
            src={item.thumbnail_url}
            alt={item.name || "Bild"}
            style={{ width: "100%", display: "block", objectFit: "cover" }}
          />
          {item.name && (
            <div style={{ background: "var(--lt-bg-card)", padding: "6px 10px", fontFamily: "var(--lt-font-mono)", fontSize: "0.65rem", color: "var(--lt-text-muted)" }}>
              {item.name}
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
}

// ── Hauptkomponente ───────────────────────────────────────────

export function MediaPickerPanel({ matchId, defaultOpen = false, playerNames = [], currentMinute = 0 }) {
  const [open, setOpen] = useState(defaultOpen);
  const [images, setImages] = useState([]);
  const [modalImage, setModalImage] = useState(null);
  const [playerId, setPlayerId] = useState("");
  const [loadingTrigger, setLoadingTrigger] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  useEffect(() => {
    if (!open) return;
    fetchQueue().then(setImages).catch((e) => setStatusMsg({ type: "error", text: e.message }));
  }, [open]);

  const handleNewMedia = useCallback((newItems) => {
    setImages((prev) => {
      const ids = new Set(prev.map((img) => img.media_id));
      const fresh = newItems.filter((i) => !ids.has(i.media_id));
      return fresh.length ? [...fresh, ...prev] : prev;
    });
  }, []);

  useMediaWebSocket(handleNewMedia, open);

  async function handleLoadImages() {
    setLoadingTrigger(true);
    setStatusMsg(null);
    try {
      await triggerN8nWebhook(playerId);
      setStatusMsg({ type: "success", text: "Workflow gestartet – Bilder erscheinen gleich..." });
      setTimeout(async () => { try { setImages(await fetchQueue()); } catch (_) {} }, 2500);
    } catch (e) {
      setStatusMsg({ type: "error", text: e.message });
    } finally {
      setLoadingTrigger(false);
    }
  }

  function handlePublished(mediaId) {
    setImages((prev) => prev.filter((img) => img.media_id !== mediaId));
    setModalImage(null);
    setStatusMsg({ type: "success", text: "✓ Im Liveticker veröffentlicht!" });
    setTimeout(() => setStatusMsg(null), 3000);
  }

  // Spin-Keyframe (einmalig via style-Tag)
  useEffect(() => {
    if (document.getElementById("lt-spin-keyframe")) return;
    const style = document.createElement("style");
    style.id = "lt-spin-keyframe";
    style.textContent = "@keyframes spin { to { transform: rotate(360deg); } }";
    document.head.appendChild(style);
  }, []);

  return (
    <>
      {modalImage && createPortal(
        <PublishModal
          image={modalImage}
          matchId={matchId}
          onClose={() => setModalImage(null)}
          onPublished={handlePublished}
          playerNames={playerNames}
          currentMinute={currentMinute}
        />,
        document.body
      )}

      <div style={{
        borderRadius: 8,
        border: "1px solid var(--lt-border)",
        background: "var(--lt-bg-card)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <button
          onClick={() => setOpen((v) => !v)}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "0.65rem 1rem", background: "transparent", border: "none", cursor: "pointer",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = "var(--lt-bg-hover)"}
          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontFamily: "var(--lt-font-mono)", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--lt-text-muted)" }}>
            <span>📷</span>
            <span>ScorePlay Bilder</span>
            {images.length > 0 && (
              <span style={{
                background: "var(--lt-accent)", color: "#0d0d0d",
                fontSize: "0.6rem", fontWeight: 700, borderRadius: 4,
                padding: "1px 6px", lineHeight: 1.4,
              }}>
                {images.length}
              </span>
            )}
          </span>
          <svg
            style={{ width: 14, height: 14, color: "var(--lt-text-faint)", transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div style={{ padding: "0.75rem 1rem 1rem", borderTop: "1px solid var(--lt-border)", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {/* Status */}
            {statusMsg && (
              <div style={{
                borderRadius: 6, padding: "0.4rem 0.75rem",
                fontFamily: "var(--lt-font-mono)", fontSize: "0.7rem",
                background: statusMsg.type === "error" ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)",
                border: `1px solid ${statusMsg.type === "error" ? "rgba(239,68,68,0.25)" : "rgba(34,197,94,0.25)"}`,
                color: statusMsg.type === "error" ? "#f87171" : "#4ade80",
              }}>
                {statusMsg.text}
              </div>
            )}

            {/* Controls */}
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                type="number"
                placeholder="Player ID (optional)"
                value={playerId}
                onChange={(e) => setPlayerId(e.target.value)}
                style={{
                  flex: 1, minWidth: 0,
                  background: "var(--lt-bg-input)", border: "1px solid var(--lt-border)",
                  borderRadius: 6, padding: "0.45rem 0.75rem",
                  fontFamily: "var(--lt-font-mono)", fontSize: "0.78rem",
                  color: "var(--lt-text)", outline: "none",
                }}
                onFocus={(e) => e.target.style.borderColor = "var(--lt-accent)"}
                onBlur={(e) => e.target.style.borderColor = "var(--lt-border)"}
              />
              <button
                onClick={handleLoadImages}
                disabled={loadingTrigger}
                style={{
                  flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "0.45rem 0.85rem", borderRadius: 6, border: "none",
                  background: loadingTrigger ? "var(--lt-bg-card-2)" : "var(--lt-accent)",
                  color: loadingTrigger ? "var(--lt-text-faint)" : "#0d0d0d",
                  fontFamily: "var(--lt-font-mono)", fontSize: "0.75rem", fontWeight: 700,
                  cursor: loadingTrigger ? "not-allowed" : "pointer", transition: "all 0.15s",
                }}
              >
                {loadingTrigger ? (
                  <svg style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" style={{ opacity: 0.25 }} />
                    <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" style={{ opacity: 0.75 }} />
                  </svg>
                ) : "↓"}
                {loadingTrigger ? "Lädt..." : "Bilder laden"}
              </button>
            </div>

            {/* Grid */}
            {images.length === 0 ? (
              <p style={{ textAlign: "center", padding: "1.5rem 0", fontFamily: "var(--lt-font-mono)", fontSize: "0.72rem", color: "var(--lt-text-faint)" }}>
                Keine Bilder in der Queue
              </p>
            ) : (
              <>
                <p style={{ fontFamily: "var(--lt-font-mono)", fontSize: "0.62rem", color: "var(--lt-text-faint)", letterSpacing: "0.04em", margin: 0 }}>
                  Doppelklick zum Veröffentlichen
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                  {images.map((img) => (
                    <MediaThumbnail key={img.media_id} item={img} onDoubleClick={setModalImage} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
