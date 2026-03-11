// ============================================================
// ModeSelector.jsx — Popover-Design mit Toast + Status-Dot
// ============================================================
import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { MODES } from "../constants";

const MODE_CFG = {
  [MODES.AUTO]: {
    label: "AUTO",
    icon: "⚡",
    color: "#ff8c42",
    colorDim: "rgba(255,140,66,0.1)",
    textColor: "#fff",
    key: "auto",
    status: "AUTO — KI veröffentlicht automatisch",
    desc: "KI veröffentlicht automatisch. Einträge erscheinen ohne deine Bestätigung.",
  },
  [MODES.COOP]: {
    label: "CO-OP",
    icon: "✦",
    color: "#e8ff47",
    colorDim: "rgba(232,255,71,0.08)",
    textColor: "#0d0d0d",
    key: "coop",
    status: "CO-OP — AI-Draft anzeigen, du entscheidest",
    desc: "KI schlägt vor, du entscheidest. Jeder Entwurf erscheint zur Prüfung. Veröffentlichung nur nach deiner Bestätigung.",
  },
  [MODES.MANUAL]: {
    label: "MANUAL",
    icon: "✎",
    color: "#4d9fff",
    colorDim: "rgba(77,159,255,0.1)",
    textColor: "#fff",
    key: "manual",
    status: "MANUAL — Volle redaktionelle Kontrolle",
    desc: "Volle redaktionelle Kontrolle. Keine KI-Vorschläge. Du schreibst alle Einträge selbst.",
  },
};

export function ModeSelector({ mode, onModeChange }) {
  const [pending, setPending] = useState(null);
  const [popPos, setPopPos]   = useState(null);
  const [toast, setToast]     = useState(null);
  const btnRefs    = useRef({});
  const toastTimer = useRef(null);

  const cancelSwitch = useCallback(() => {
    setPending(null);
    setPopPos(null);
  }, []);

  const confirmSwitch = useCallback(() => {
    if (!pending) return;
    const cfg = MODE_CFG[pending];
    onModeChange(pending);
    setPending(null);
    setPopPos(null);
    setToast({ text: `${cfg.icon} Modus gewechselt: ${cfg.label}`, color: cfg.color });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, [pending, onModeChange]);

  const requestSwitch = useCallback((m) => {
    if (m === mode) return;
    const btn = btnRefs.current[m];
    if (!btn) return;
    const rect  = btn.getBoundingClientRect();
    const popW  = 284;
    let left = rect.left + rect.width / 2 - popW / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - popW - 8));
    setPopPos({ top: rect.bottom + 10, left });
    setPending(m);
  }, [mode]);

  // Enter / Esc when popover open
  useEffect(() => {
    if (!pending) return;
    const h = (e) => {
      if (e.key === "Enter")  { e.preventDefault(); confirmSwitch(); }
      if (e.key === "Escape") { e.preventDefault(); cancelSwitch(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [pending, confirmSwitch, cancelSwitch]);

  // Ctrl+1/2/3 shortcuts
  useEffect(() => {
    const h = (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      if (e.key === "1") { e.preventDefault(); requestSwitch(MODES.AUTO); }
      if (e.key === "2") { e.preventDefault(); requestSwitch(MODES.COOP); }
      if (e.key === "3") { e.preventDefault(); requestSwitch(MODES.MANUAL); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [requestSwitch]);

  // Outside click closes popover
  useEffect(() => {
    if (!pending) return;
    const h = (e) => {
      if (!e.target.closest(".lt-mode-bar") && !e.target.closest(".lt-mode-popover")) {
        cancelSwitch();
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [pending, cancelSwitch]);

  // Resize / scroll closes popover
  useEffect(() => {
    if (!pending) return;
    const h = () => cancelSwitch();
    window.addEventListener("resize", h);
    window.addEventListener("scroll", h, true);
    return () => {
      window.removeEventListener("resize", h);
      window.removeEventListener("scroll", h, true);
    };
  }, [pending, cancelSwitch]);

  const activeCfg = MODE_CFG[mode];
  const pendingCfg = pending ? MODE_CFG[pending] : null;

  return (
    <>
      <div className="lt-mode-bar">
        {/* Status */}
        <div className="lt-mode-status">
          <span className={`lt-mode-dot lt-mode-dot--${activeCfg.key}`} />
          <span className="lt-mode-status__text">{activeCfg.status}</span>
        </div>

        {/* Buttons */}
        <div className="lt-mode-bar__group">
          {Object.values(MODES).map((m) => {
            const cfg     = MODE_CFG[m];
            const isActive = mode === m;
            return (
              <button
                key={m}
                ref={(el) => { btnRefs.current[m] = el; }}
                className={`lt-mode-bar__btn${isActive ? ` lt-mode-bar__btn--active lt-mode-bar__btn--${cfg.key}` : ""}${pending === m ? " lt-mode-bar__btn--pending" : ""}`}
                style={isActive ? { "--btn-bg": cfg.color, "--btn-fg": cfg.textColor } : undefined}
                onClick={() => requestSwitch(m)}
              >
                {cfg.label}
              </button>
            );
          })}
        </div>

        {/* Keyboard hints */}
        <div className="lt-mode-bar__hints">
          <span><kbd className="lt-mode-kbd">Ctrl+1</kbd> Auto</span>
          <span><kbd className="lt-mode-kbd">Ctrl+2</kbd> CO-OP</span>
          <span><kbd className="lt-mode-kbd">Ctrl+3</kbd> Manual</span>
        </div>
      </div>

      {/* Popover — fixed via portal */}
      {pending && popPos && pendingCfg && createPortal(
        <div className="lt-mode-popover" style={{ top: popPos.top, left: popPos.left }}>
          <div className="lt-mode-popover__bar" style={{ background: pendingCfg.color }} />
          <div className="lt-mode-popover__body">
            <div className="lt-mode-popover__head">
              <div className="lt-mode-popover__ico" style={{ background: pendingCfg.colorDim }}>
                {pendingCfg.icon}
              </div>
              <div>
                <div className="lt-mode-popover__eyebrow">Modus wechseln zu</div>
                <div className="lt-mode-popover__title" style={{ color: pendingCfg.color }}>
                  {pendingCfg.label}
                </div>
              </div>
            </div>
            <div className="lt-mode-popover__desc">{pendingCfg.desc}</div>
            <div className="lt-mode-popover__actions">
              <button className="lt-mode-popover__cancel" onClick={cancelSwitch}>
                Abbrechen
              </button>
              <button
                className="lt-mode-popover__confirm"
                style={{ background: pendingCfg.color, color: pendingCfg.textColor }}
                onClick={confirmSwitch}
              >
                {pendingCfg.icon} Zu {pendingCfg.label} wechseln
              </button>
            </div>
          </div>
          <div className="lt-mode-popover__shortcuts">
            <span className="lt-mode-popover__sh"><kbd className="lt-mode-kbd">↵</kbd> Bestätigen</span>
            <span className="lt-mode-popover__sh"><kbd className="lt-mode-kbd">Esc</kbd> Abbrechen</span>
          </div>
        </div>,
        document.body
      )}

      {/* Toast */}
      {toast && createPortal(
        <div className="lt-mode-toast">
          <span className="lt-mode-dot lt-mode-dot--sm" style={{ background: toast.color }} />
          {toast.text}
        </div>,
        document.body
      )}
    </>
  );
}
