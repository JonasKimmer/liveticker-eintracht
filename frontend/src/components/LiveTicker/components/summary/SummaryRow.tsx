import { useState } from "react";
import { PREMATCH_PHASES, PHASE_LABEL } from "../../constants";
import type { TickerEntry } from "../../../../types";

// ── Hilfsfunktionen (auch von SummarySection genutzt) ────────

export function getDraftLabel(draft: TickerEntry) {
  if (draft.phase && PHASE_LABEL[draft.phase]) return PHASE_LABEL[draft.phase];
  if (draft.icon === "🔔") return "Halbzeit";
  return "KI-Text";
}

export function getSummaryMeta(
  draft: Pick<TickerEntry, "icon" | "video_url">,
  phase: string | null | undefined,
) {
  const icon =
    draft.icon ||
    (phase && PREMATCH_PHASES.has(phase) ? "📣" : phase ? "🎙️" : "✦");
  let cssClass = "summary";
  if (draft.icon === "🎬" || draft.video_url) cssClass = "summary--video";
  else if (PREMATCH_PHASES.has(phase)) cssClass = "summary--prematch";
  else if (
    phase === "FirstHalf" ||
    phase === "SecondHalf" ||
    phase === "ExtraFirstHalf" ||
    phase === "ExtraSecondHalf"
  )
    cssClass = "summary--live";
  else if (phase === "FirstHalfBreak" || phase === "ExtraBreak")
    cssClass = "summary--halftime";
  else if (phase === "After" || phase === "FullTime")
    cssClass = "summary--after";
  else if (phase === "PenaltyShootout") cssClass = "summary--penalty";
  return { icon, cssClass };
}

// ── Komponente ────────────────────────────────────────────────

interface SummaryRowProps {
  draft: TickerEntry;
  label: string;
  isSelected?: boolean;
  onSelect: () => void;
  onReject: () => void;
}

export function SummaryRow({
  draft,
  label,
  isSelected,
  onSelect,
  onReject,
}: SummaryRowProps) {
  const [confirmReject, setConfirmReject] = useState(false);
  const { icon, cssClass } = getSummaryMeta(draft, draft.phase);
  return (
    <div
      className={`lt-event-card lt-event-card__${cssClass}${isSelected ? " lt-event-card--selected" : ""}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
    >
      <div className="lt-event-card__row">
        <span className="lt-event-card__icon">{icon}</span>
        <span className="lt-event-card__raw">
          {label}
          {draft.text
            ? ` · ${draft.text.slice(0, 50)}${draft.text.length > 50 ? "…" : ""}`
            : ""}
        </span>
        {!confirmReject && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setConfirmReject(true);
            }}
            title="Ablehnen"
            style={{
              marginLeft: "auto",
              flexShrink: 0,
              background: "none",
              border: "none",
              color: "var(--lt-text-faint)",
              cursor: "pointer",
              fontSize: "0.75rem",
              padding: "0 2px",
              opacity: 0.5,
            }}
          >
            ✕
          </button>
        )}
        {confirmReject && (
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <span style={{ fontSize: "0.7rem", color: "var(--lt-text-muted)" }}>
              Ablehnen?
            </span>
            <button
              style={{
                fontSize: "0.7rem",
                padding: "1px 6px",
                background: "rgba(239,68,68,0.15)",
                border: "1px solid rgba(239,68,68,0.3)",
                color: "#f87171",
                borderRadius: 4,
                cursor: "pointer",
              }}
              onClick={() => {
                onReject();
                setConfirmReject(false);
              }}
            >
              Ja
            </button>
            <button
              style={{
                fontSize: "0.7rem",
                padding: "1px 6px",
                background: "none",
                border: "1px solid var(--lt-border)",
                color: "var(--lt-text-muted)",
                borderRadius: 4,
                cursor: "pointer",
              }}
              onClick={() => setConfirmReject(false)}
            >
              Nein
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
