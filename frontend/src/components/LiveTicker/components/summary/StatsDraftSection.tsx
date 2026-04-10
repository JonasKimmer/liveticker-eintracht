import { useCallback, useMemo } from "react";
import { CollapsibleSection } from "../Collapsible";
import { SummaryRow } from "./SummaryRow";
import { SummaryDraftCard } from "./SummaryDraftCard";
import { STATS_ENTRY_ICON } from "../../constants";
import { useTickerDataContext } from "context/TickerDataContext";
import { useTickerActionsContext } from "context/TickerActionsContext";
import * as api from "api";

interface StatsDraftSectionProps {
  selectedId: number | null;
  onSelect: (updater: ((prev: number | null) => number | null) | null) => void;
}

export function StatsDraftSection({ selectedId, onSelect }: StatsDraftSectionProps) {
  const { tickerTexts, reload } = useTickerDataContext();
  const { onPublished } = useTickerActionsContext();

  const drafts = useMemo(
    () =>
      tickerTexts.filter(
        (t) =>
          t.status === "draft" &&
          t.source === "manual" &&
          t.icon === STATS_ENTRY_ICON &&
          !t.event_id,
      ),
    [tickerTexts],
  );

  const handleReject = useCallback(
    async (draftId: number) => {
      await api.deleteTicker(draftId);
      await reload.loadTickerTexts();
      onSelect(null);
    },
    [reload, onSelect],
  );

  const handlePublish = useCallback(
    async (draftId: number, text: string, minute?: number | null) => {
      await api.updateTicker(draftId, {
        text,
        status: "published",
        ...(minute != null ? { minute } : {}),
      });
      await reload.loadTickerTexts();
      onPublished?.(draftId, text);
    },
    [reload, onPublished],
  );

  const handleBulkPublish = useCallback(async () => {
    for (const draft of drafts) {
      await api.updateTicker(draft.id, { status: "published" });
    }
    await reload.loadTickerTexts();
  }, [drafts, reload]);

  if (!drafts.length) return null;

  return (
    <CollapsibleSection
      title="Statistiken"
      count={drafts.length}
      actions={
        drafts.length > 1 ? (
          <button
            className="lt-event-card__gen-btn"
            onClick={handleBulkPublish}
            title="Alle Statistik-Drafts veröffentlichen"
          >
            ✓ Alle
          </button>
        ) : null
      }
    >
      {drafts.map((draft) => {
        const isSelected = selectedId === draft.id;
        return (
          <div key={draft.id}>
            <SummaryRow
              draft={draft}
              label="Statistik-Update"
              isSelected={isSelected}
              onSelect={() => onSelect((prev) => (prev === draft.id ? null : draft.id))}
              onReject={() => handleReject(draft.id)}
            />
            {isSelected && (
              <SummaryDraftCard
                draft={draft}
                label="Statistik-Update"
                onPublish={(text, minute) => handlePublish(draft.id, text, minute)}
                onReject={() => handleReject(draft.id)}
                showMinute
              />
            )}
          </div>
        );
      })}
    </CollapsibleSection>
  );
}
