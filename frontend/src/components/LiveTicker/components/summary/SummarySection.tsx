import { useCallback, useMemo } from "react";
import { CollapsibleSection } from "../Collapsible";
import { SummaryDraftCard } from "./SummaryDraftCard";
import { SummaryRow, getDraftLabel } from "./SummaryRow";
import { AutoPlayVideo } from "../AutoPlayVideo";
import { PREMATCH_PHASES } from "../../constants";
import { useTickerDataContext } from "context/TickerDataContext";
import { useTickerActionsContext } from "context/TickerActionsContext";
import * as api from "api";

/**
 * Zeigt entweder die Vorberichterstattungs- oder die Spielphasen-Sektion.
 *
 * @param {object} props
 * @param {boolean} props.isPrematch          - true = Vorberichterstattung, false = Spielphasen
 * @param {string}  props.title               - Sektions-Titel
 * @param {number|null} props.selectedId      - aktuell geöffneter Draft (selectedSummaryDraftId)
 * @param {Function} props.onSelect           - setSelectedSummaryDraftId
 * @param {string|null} props.generatingId    - bulkPublishingSection (null|"prematch"|"spielphasen"|"regenerating")
 * @param {Function} props.onBulkPublish      - handleBulkPublishPrematch / handleBulkPublishSpielphase
 * @param {Function} props.onRegenerate       - handleRegenerateSummaryDraft(draftId, style)
 */
import type { TickerStyle } from "../../../../types";

interface SummarySectionProps {
  isPrematch: boolean;
  title: string;
  selectedId: number | null;
  onSelect: (updater: ((prev: number | null) => number | null) | null) => void;
  generatingId: string | null;
  onBulkPublish: () => void;
  onRegenerate: (draftId: number, style: TickerStyle) => void;
}

export function SummarySection({
  isPrematch,
  title,
  selectedId,
  onSelect,
  generatingId,
  onBulkPublish,
  onRegenerate,
}: SummarySectionProps) {
  const { tickerTexts, reload } = useTickerDataContext();
  const { onPublished } = useTickerActionsContext();

  const handleReject = useCallback(async (draftId: number) => {
    await api.deleteTicker(draftId);
    await reload.loadTickerTexts();
    onSelect(null);
  }, [reload, onSelect]);

  const handlePublish = useCallback(async (draftId: number, text: string) => {
    await api.publishTicker(draftId, text);
    await reload.loadTickerTexts();
    onPublished?.(draftId, text);
  }, [reload, onPublished]);

  const sectionKey = isPrematch ? "prematch" : "spielphasen";
  const isBulkPublishing = generatingId === sectionKey;

  const drafts = useMemo(() => {
    const filtered = tickerTexts.filter(
      (t) =>
        t.status === "draft" &&
        !t.event_id &&
        (isPrematch
          ? PREMATCH_PHASES.has(t.phase)
          : !PREMATCH_PHASES.has(t.phase)),
    );
    return isPrematch
      ? filtered.sort(
          (a, b) => (a.synthetic_event_id ?? 0) - (b.synthetic_event_id ?? 0),
        )
      : filtered;
  }, [tickerTexts, isPrematch]);

  if (!drafts.length) return null;

  return (
    <CollapsibleSection
      title={title}
      count={drafts.length}
      actions={
        drafts.length > 1 ? (
          <button
            className="lt-event-card__gen-btn"
            onClick={onBulkPublish}
            disabled={isBulkPublishing}
            title={`Alle ${title}-Drafts veröffentlichen`}
          >
            {isBulkPublishing ? "…" : "✓ Alle"}
          </button>
        ) : null
      }
    >
      {drafts.map((draft) => {
        const isSelected = selectedId === draft.id;
        const isVideo = draft.icon === "🎬" || !!draft.video_url;
        return (
          <div key={draft.id}>
            <SummaryRow
              draft={draft}
              label={getDraftLabel(draft)}
              isSelected={isSelected}
              onSelect={() =>
                onSelect((prev) => (prev === draft.id ? null : draft.id))
              }
              onReject={() => handleReject(draft.id)}
            />

            {isSelected && isPrematch && (
              <SummaryDraftCard
                draft={draft}
                label={getDraftLabel(draft)}
                onPublish={(text) => handlePublish(draft.id, text)}
                onReject={() => handleReject(draft.id)}
                onGenerate={onRegenerate}
                generatingId={generatingId}
              />
            )}

            {isSelected && !isPrematch && isVideo && (
              <div
                style={{
                  background: "var(--lt-surface)",
                  borderRadius: 8,
                  padding: "0.75rem",
                  border: "1px solid var(--lt-border)",
                  marginBottom: "0.5rem",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--lt-font-mono)",
                    fontSize: "0.7rem",
                    color: "var(--lt-text-muted)",
                    marginBottom: "0.5rem",
                  }}
                >
                  🎬 Video
                </div>
                {draft.video_url && (
                  <AutoPlayVideo
                    src={draft.video_url}
                    style={{
                      width: "100%",
                      borderRadius: 6,
                      marginBottom: "0.5rem",
                      maxHeight: 220,
                    }}
                  />
                )}
                <div
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    marginTop: "0.5rem",
                  }}
                >
                  <button
                    className="lt-event-card__gen-btn"
                    style={{
                      flex: 1,
                      background: "rgba(34,197,94,0.15)",
                      color: "#4ade80",
                    }}
                    onClick={async () => {
                      await api.updateTicker(draft.id, { status: "published" });
                      await reload.loadTickerTexts();
                      onPublished?.(draft.id, draft.text || "🎬 Video");
                    }}
                  >
                    ✓ Veröffentlichen
                  </button>
                  <button
                    className="lt-event-card__gen-btn"
                    style={{
                      flex: 1,
                      background: "rgba(239,68,68,0.1)",
                      color: "#f87171",
                    }}
                    onClick={() => handleReject(draft.id)}
                  >
                    ✕ Ablehnen
                  </button>
                </div>
              </div>
            )}

            {isSelected && !isPrematch && !isVideo && (
              <SummaryDraftCard
                draft={draft}
                label={getDraftLabel(draft)}
                onPublish={(text) => handlePublish(draft.id, text)}
                onReject={() => handleReject(draft.id)}
                onGenerate={onRegenerate}
                generatingId={generatingId}
              />
            )}
          </div>
        );
      })}
    </CollapsibleSection>
  );
}
