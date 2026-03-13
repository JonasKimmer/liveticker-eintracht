// ============================================================
// InstagramPanel.jsx — Instagram-Posts von @EintrachtFrankfurt
// Flow: n8n RSS → DB → Klick → Modal → Ticker
// ============================================================

import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { fetchInstagramPosts, triggerInstagramImport, publishClip, deleteClip } from "../../../api";

const INSTA_GRADIENT = "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)";

// ── Publish Modal ─────────────────────────────────────────────

function InstaPublishModal({ post, matchId, currentMinute, onClose, onPublished }) {
  const [text, setText] = useState(post.title ?? "");
  const [minute, setMinute] = useState(currentMinute ?? 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e?.preventDefault();
    if (!text.trim()) { setError("Text darf nicht leer sein."); return; }
    setLoading(true);
    setError(null);
    try {
      await publishClip(post.id, matchId, text.trim(), minute || null);
      onPublished(post.id);
    } catch (err) {
      setError(err?.response?.data?.detail ?? err.message ?? "Fehler");
      setLoading(false);
    }
  }

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
          <span style={{ fontSize: "1.1rem" }}>📸</span>
          <span style={{ fontFamily: "var(--lt-font-mono)", fontSize: "0.7rem", color: "var(--lt-text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Instagram · @EintrachtFrankfurt
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
                <label style={{ fontFamily: "var(--lt-font-mono)", fontSize: "0.65rem", color: "var(--lt-text-muted)" }}>Min</label>
                <input
                  type="number"
                  value={minute}
                  min={0} max={120}
                  onChange={(e) => setMinute(Number(e.target.value))}
                  style={{
                    width: 46, background: "var(--lt-bg-input)", border: "1px solid var(--lt-border)",
                    borderRadius: 4, padding: "2px 4px",
                    fontFamily: "var(--lt-font-mono)", fontSize: "0.78rem",
                    color: "var(--lt-text)", outline: "none", textAlign: "center",
                  }}
                />
              </div>
            </div>
            <textarea
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.ctrlKey && e.key === "Enter") handleSubmit(); }}
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
              <span style={{ color: "var(--lt-accent)" }}>Ctrl+↵</span> Veröffentlichen
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
              disabled={loading || !text.trim()}
              style={{
                flex: 2, padding: "0.6rem", borderRadius: 6, border: "none",
                background: loading || !text.trim() ? "var(--lt-bg-card-2)" : INSTA_GRADIENT,
                color: loading || !text.trim() ? "var(--lt-text-faint)" : "#fff",
                fontFamily: "var(--lt-font-mono)", fontSize: "0.8rem", fontWeight: 700,
                cursor: loading || !text.trim() ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Publiziere…" : "📸 Im Ticker veröffentlichen"}
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

// ── Post-Karte ────────────────────────────────────────────────

function InstaCard({ post, onClick, onDelete }) {
  const [hovered, setHovered] = useState(false);
  const hasThumbnail = !!post.thumbnail_url;

  if (hasThumbnail) {
    return (
      <div
        style={{ position: "relative", borderRadius: 6, overflow: "hidden" }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <button
          onClick={() => onClick(post)}
          style={{
            width: "100%", padding: 0, border: "none", background: "none",
            cursor: "pointer", display: "block", outline: "none",
          }}
        >
          {/* Thumbnail */}
          <div style={{ position: "relative", paddingTop: "100%", background: "var(--lt-bg-card-2)" }}>
            <img
              src={post.thumbnail_url}
              alt={post.title}
              referrerPolicy="no-referrer"
              style={{
                position: "absolute", inset: 0, width: "100%", height: "100%",
                objectFit: "cover",
                transition: "transform 0.2s",
                transform: hovered ? "scale(1.04)" : "scale(1)",
              }}
            />
            {/* Gradient overlay on hover */}
            <div style={{
              position: "absolute", inset: 0,
              background: hovered
                ? "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)"
                : "linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)",
              transition: "background 0.2s",
            }} />
            {/* Instagram gradient border on hover */}
            {hovered && (
              <div style={{
                position: "absolute", inset: 0,
                boxShadow: `inset 0 0 0 2px transparent`,
                borderRadius: 6,
                background: "none",
                outline: "2px solid #e6683c",
                outlineOffset: "-2px",
              }} />
            )}
            {/* Caption */}
            <p style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              margin: 0, padding: "0.4rem 0.5rem",
              fontFamily: "var(--lt-font-mono)", fontSize: "0.6rem", color: "#fff",
              lineHeight: 1.4,
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
            }}>
              {post.title}
            </p>
          </div>
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); onDelete(post.id); }}
          style={{
            position: "absolute", top: 4, right: 4,
            width: 20, height: 20, borderRadius: "50%",
            background: "rgba(0,0,0,0.6)", border: "none",
            color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: "0.6rem",
            display: "flex", alignItems: "center", justifyContent: "center",
            opacity: hovered ? 1 : 0, transition: "opacity 0.15s",
          }}
          title="Löschen"
        >✕</button>
      </div>
    );
  }

  // Text-only fallback (no thumbnail)
  return (
    <div
      style={{ position: "relative" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        onClick={() => onClick(post)}
        style={{
          width: "100%", textAlign: "left", display: "block",
          borderRadius: 6,
          border: hovered ? "1px solid transparent" : "1px solid var(--lt-border)",
          backgroundImage: hovered ? INSTA_GRADIENT : "none",
          backgroundOrigin: "border-box",
          background: hovered ? undefined : "var(--lt-bg-card-2)",
          padding: hovered ? "1px" : "0",
          cursor: "pointer", outline: "none",
          transition: "border-color 0.15s",
        }}
      >
        <div style={{
          background: "var(--lt-bg-card-2)", borderRadius: hovered ? 5 : 6,
          padding: "0.6rem 0.75rem",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.35rem" }}>
            <span style={{ fontSize: "0.75rem" }}>📸</span>
            <span style={{ fontFamily: "var(--lt-font-mono)", fontSize: "0.6rem", color: "var(--lt-text-muted)" }}>
              @EintrachtFrankfurt
            </span>
          </div>
          <p style={{
            fontFamily: "var(--lt-font-mono)", fontSize: "0.68rem", color: "var(--lt-text)",
            margin: 0, lineHeight: 1.5,
            display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>
            {post.title}
          </p>
          {post.video_url && (
            <a
              href={post.video_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{
                display: "inline-block", marginTop: "0.3rem",
                fontFamily: "var(--lt-font-mono)", fontSize: "0.58rem",
                color: "var(--lt-accent)", textDecoration: "none",
              }}
            >
              → Original ansehen
            </a>
          )}
        </div>
      </button>

      <button
        onClick={(e) => { e.stopPropagation(); onDelete(post.id); }}
        style={{
          position: "absolute", top: 4, right: 4,
          width: 20, height: 20, borderRadius: "50%",
          background: "rgba(0,0,0,0.6)", border: "none",
          color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: "0.6rem",
          display: "flex", alignItems: "center", justifyContent: "center",
          opacity: hovered ? 1 : 0, transition: "opacity 0.15s",
        }}
        title="Löschen"
      >✕</button>
    </div>
  );
}

// ── Hauptkomponente ───────────────────────────────────────────

export function InstagramPanel({ matchId, currentMinute = 0 }) {
  const [open, setOpen] = useState(false);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [modalPost, setModalPost] = useState(null);
  const [statusMsg, setStatusMsg] = useState(null);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetchInstagramPosts();
      setPosts(res.data ?? []);
    } catch {
      setStatusMsg({ type: "error", text: "Fehler beim Laden der Posts." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    loadPosts();
  }, [open, loadPosts]);

  async function handleImport() {
    setImporting(true);
    setStatusMsg(null);
    try {
      await triggerInstagramImport();
      setStatusMsg({ type: "success", text: "Import gestartet – lade in 3s neu…" });
      setTimeout(() => loadPosts(), 3000);
    } catch {
      setStatusMsg({ type: "error", text: "n8n-Workflow konnte nicht gestartet werden." });
    } finally {
      setImporting(false);
    }
  }

  function handlePublished(postId) {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    setModalPost(null);
    setStatusMsg({ type: "success", text: "✓ Im Liveticker veröffentlicht!" });
    setTimeout(() => setStatusMsg(null), 3000);
  }

  async function handleDelete(postId) {
    try {
      await deleteClip(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch {
      setStatusMsg({ type: "error", text: "Löschen fehlgeschlagen." });
    }
  }

  return (
    <>
      {modalPost && createPortal(
        <InstaPublishModal
          post={modalPost}
          matchId={matchId}
          currentMinute={currentMinute}
          onClose={() => setModalPost(null)}
          onPublished={handlePublished}
        />,
        document.body
      )}

      <div style={{ borderRadius: 8, border: "1px solid var(--lt-border)", background: "var(--lt-bg-card)", overflow: "hidden" }}>
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
            <span>📸</span>
            <span>Instagram · @EintrachtFrankfurt</span>
            {posts.length > 0 && (
              <span style={{
                background: INSTA_GRADIENT, color: "#fff",
                fontSize: "0.6rem", fontWeight: 700, borderRadius: 4, padding: "1px 6px", lineHeight: 1.4,
              }}>
                {posts.length}
              </span>
            )}
          </span>
          <svg style={{ width: 14, height: 14, color: "var(--lt-text-faint)", transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div style={{ padding: "0.75rem 1rem 1rem", borderTop: "1px solid var(--lt-border)", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
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

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <button
                onClick={handleImport}
                disabled={importing}
                style={{
                  flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "0.4rem 0.75rem", borderRadius: 6, border: "none",
                  backgroundImage: importing ? "none" : INSTA_GRADIENT,
                  background: importing ? "var(--lt-bg-card-2)" : undefined,
                  color: importing ? "var(--lt-text-faint)" : "#fff",
                  fontFamily: "var(--lt-font-mono)", fontSize: "0.72rem", fontWeight: 700,
                  cursor: importing ? "not-allowed" : "pointer",
                }}
              >
                {importing ? "Importiert…" : "📸 Posts importieren"}
              </button>
              <button
                onClick={loadPosts}
                disabled={loading}
                style={{
                  flexShrink: 0, padding: "0.4rem 0.6rem", borderRadius: 6,
                  border: "1px solid var(--lt-border)", background: "transparent",
                  color: "var(--lt-text-muted)", fontFamily: "var(--lt-font-mono)", fontSize: "0.7rem",
                  cursor: loading ? "not-allowed" : "pointer",
                }}
                title="Aktualisieren"
              >
                ↺
              </button>
            </div>

            {loading && (
              <p style={{ textAlign: "center", padding: "1rem 0", fontFamily: "var(--lt-font-mono)", fontSize: "0.72rem", color: "var(--lt-text-faint)" }}>
                Lädt…
              </p>
            )}
            {!loading && posts.length === 0 && (
              <p style={{ textAlign: "center", padding: "1rem 0", fontFamily: "var(--lt-font-mono)", fontSize: "0.72rem", color: "var(--lt-text-faint)" }}>
                Keine Posts – erst importieren
              </p>
            )}
            {!loading && posts.length > 0 && (
              <>
                <p style={{ fontFamily: "var(--lt-font-mono)", fontSize: "0.62rem", color: "var(--lt-text-faint)", letterSpacing: "0.04em", margin: 0 }}>
                  Klick → Text bearbeiten + veröffentlichen
                </p>
                {posts.some((p) => p.thumbnail_url) ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem" }}>
                    {posts.map((post) => (
                      <InstaCard key={post.id} post={post} onClick={setModalPost} onDelete={handleDelete} />
                    ))}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    {posts.map((post) => (
                      <InstaCard key={post.id} post={post} onClick={setModalPost} onDelete={handleDelete} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
