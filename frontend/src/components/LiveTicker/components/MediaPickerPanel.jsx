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

function PublishModal({ image, matchId, onClose, onPublished }) {
  const [description, setDescription] = useState("");
  const [minute, setMinute] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showCmds, setShowCmds] = useState(false);
  const [error, setError] = useState(null);
  const textareaRef = useRef(null);

  const minuteNum = parseInt(minute, 10) || 0;
  const preview = useMemo(() => {
    if (!description.trim().startsWith("/")) return null;
    return parseCommand(description, minuteNum);
  }, [description, minuteNum]);

  useEffect(() => { textareaRef.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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

  function handleKeyDown(e) {
    if (e.key === "Enter" && description.trim() === "/g") {
      e.preventDefault();
      handleGenerate();
      return;
    }
    if (e.key === "Enter" && !e.ctrlKey && !e.shiftKey && description.trim().startsWith("/")) {
      if (preview?.isValid) {
        e.preventDefault();
        setDescription(preview.formatted);
      }
      return;
    }
    if (e.ctrlKey && e.key === "Enter") {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!description.trim()) { setError("Text darf nicht leer sein."); return; }
    setLoading(true);
    setError(null);
    try {
      await publishMedia({ mediaId: image.media_id, description: description.trim(), matchId, minute: minute || null });
      onPublished(image.media_id);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <label style={{ fontFamily: "var(--lt-font-mono)", fontSize: "0.65rem", color: "var(--lt-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Ticker-Text
              </label>
              <button type="button" onClick={() => setShowCmds(s => !s)} style={{ fontFamily: "var(--lt-font-mono)", fontSize: "0.62rem", color: "var(--lt-accent)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                {showCmds ? "Commands ausblenden" : "⚡ Commands"}
              </button>
            </div>
            {showCmds && (
              <div style={{ marginBottom: 8, padding: "0.5rem 0.75rem", background: "var(--lt-bg-card-2)", borderRadius: 6, border: "1px solid var(--lt-border)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem 0.75rem" }}>
                {[
                  ["/goal Müller FCB", `${minuteNum || "??"}'  ⚽ TOR`],
                  ["/card Müller FCB yellow", `${minuteNum || "??"}'  🟨 KARTE`],
                  ["/card Müller FCB red", `${minuteNum || "??"}'  🟥 ROTE KARTE`],
                  ["/sub Kimmich Coman FCB", `${minuteNum || "??"}'  🔄 WECHSEL`],
                  ["/note Ecke für FCB", `${minuteNum || "??"}'  — Notiz`],
                  ["/g", "KI-Text generieren"],
                ].map(([cmd, result]) => (
                  <div key={cmd} style={{ cursor: "pointer" }} onClick={() => { setDescription(cmd); textareaRef.current?.focus(); setShowCmds(false); }}>
                    <code style={{ fontFamily: "var(--lt-font-mono)", fontSize: "0.68rem", color: "var(--lt-accent)" }}>{cmd}</code>
                    <div style={{ fontFamily: "var(--lt-font-mono)", fontSize: "0.6rem", color: "var(--lt-text-faint)" }}>{result}</div>
                  </div>
                ))}
              </div>
            )}
            <textarea
              ref={textareaRef}
              placeholder="/goal Müller FCB · /card Müller FCB yellow · /g + Enter für KI-Text"
              value={generating ? "✦ Generiere…" : description}
              onChange={(e) => setDescription(e.target.value)}
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
            {!description.trim().startsWith("/") && (
              <div style={{ fontFamily: "var(--lt-font-mono)", fontSize: "0.65rem", color: "var(--lt-text-faint)", marginTop: 4 }}>
                Tippe <span style={{ color: "var(--lt-accent)" }}>/</span> für Commands · <kbd style={{ background: "var(--lt-bg-card-2)", border: "1px solid var(--lt-border)", borderRadius: 3, padding: "1px 4px", fontSize: "0.6rem" }}>Ctrl+Enter</kbd> zum Veröffentlichen
              </div>
            )}
            {preview && (
              <div style={{
                marginTop: 6, padding: "0.4rem 0.6rem", borderRadius: 5,
                background: preview.isValid ? "rgba(16,185,129,0.08)" : "rgba(245,158,11,0.08)",
                border: `1px solid ${preview.isValid ? "rgba(16,185,129,0.25)" : "rgba(245,158,11,0.25)"}`,
                fontFamily: "var(--lt-font-mono)", fontSize: "0.72rem",
                color: preview.isValid ? "var(--lt-text)" : "var(--lt-text-muted)",
              }}>
                <span style={{ opacity: 0.6, fontSize: "0.62rem" }}>{preview.isValid ? "✓ " : "⚠ "}</span>
                {preview.formatted}
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ flex: "0 0 auto" }}>
              <label style={{ fontFamily: "var(--lt-font-mono)", fontSize: "0.65rem", color: "var(--lt-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 4 }}>
                Minute
              </label>
              <input
                type="number"
                placeholder="z.B. 23"
                value={minute}
                onChange={(e) => setMinute(e.target.value)}
                min={0} max={120}
                style={{
                  width: 90,
                  background: "var(--lt-bg-input)", border: "1px solid var(--lt-border)",
                  borderRadius: 6, padding: "0.5rem 0.75rem",
                  fontFamily: "var(--lt-font-mono)", fontSize: "0.82rem",
                  color: "var(--lt-text)", outline: "none",
                }}
                onFocus={(e) => e.target.style.borderColor = "var(--lt-accent)"}
                onBlur={(e) => e.target.style.borderColor = "var(--lt-border)"}
              />
            </div>
            <span style={{ fontFamily: "var(--lt-font-mono)", fontSize: "0.7rem", color: "var(--lt-text-faint)", marginTop: 18 }}>
              optional
            </span>
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
              disabled={loading || !description.trim()}
              style={{
                flex: 2, padding: "0.6rem", borderRadius: 6, border: "none",
                background: description.trim() && !loading ? "var(--lt-accent)" : "var(--lt-bg-card-2)",
                color: description.trim() && !loading ? "#0d0d0d" : "var(--lt-text-faint)",
                fontFamily: "var(--lt-font-mono)", fontSize: "0.8rem", fontWeight: 700,
                cursor: description.trim() && !loading ? "pointer" : "not-allowed",
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

export function MediaPickerPanel({ matchId, defaultOpen = false }) {
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
