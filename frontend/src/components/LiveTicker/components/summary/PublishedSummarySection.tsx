import { CollapsibleSection } from "../Collapsible";
import { getSummaryMeta, getDraftLabel } from "./SummaryRow";
import { useTickerDataContext } from "context/TickerDataContext";
import * as api from "api";

/**
 * Veröffentlichte Summary-Einträge (Vorberichterstattung + Spielphasen).
 * Ermöglicht Stornierung einzelner Einträge zurück in "draft".
 *
 * @param {object}   props
 * @param {Function} props.onRetract - (entryId: number) => void — aufgerufen vor dem API-Call
 */
interface PublishedSummarySectionProps {
  onRetract: (id: number) => void;
}

export function PublishedSummarySection({
  onRetract,
}: PublishedSummarySectionProps) {
  const { tickerTexts, reload } = useTickerDataContext();

  const published = tickerTexts
    .filter((t) => t.status === "published")
    .sort(
      (a, b) =>
        new Date(b.created_at as string).getTime() -
        new Date(a.created_at as string).getTime(),
    );

  if (!published.length) return null;

  return (
    <CollapsibleSection
      title="Veröffentlicht"
      count={published.length}
      defaultOpen={false}
    >
      {published.map((entry) => {
        const { icon, cssClass } = getSummaryMeta(entry, entry.phase);
        const label = getDraftLabel(entry);
        return (
          <div
            key={entry.id}
            className={`lt-event-card lt-event-card__${cssClass}`}
            style={{ opacity: 0.65 }}
          >
            <div className="lt-event-card__row">
              <span className="lt-event-card__icon">{icon}</span>
              <span className="lt-event-card__raw">
                {label}
                {entry.text
                  ? ` · ${entry.text.slice(0, 50)}${entry.text.length > 50 ? "…" : ""}`
                  : ""}
              </span>
              <button
                onClick={async () => {
                  onRetract(entry.id);
                  await api.updateTicker(entry.id, { status: "draft" });
                  await reload.loadTickerTexts();
                }}
                style={{
                  marginLeft: "auto",
                  flexShrink: 0,
                  background: "none",
                  border: "1px solid var(--lt-border)",
                  color: "var(--lt-text-muted)",
                  cursor: "pointer",
                  fontSize: "0.7rem",
                  padding: "1px 8px",
                  borderRadius: 4,
                  whiteSpace: "nowrap",
                }}
              >
                ↩ Stornieren
              </button>
            </div>
          </div>
        );
      })}
    </CollapsibleSection>
  );
}
