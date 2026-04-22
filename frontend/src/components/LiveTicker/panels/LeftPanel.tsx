import { memo, useMemo } from "react";
import { PublishedEntry } from "../components/entry/PublishedEntry";
import { PHASE_SORT, PHASE_MINUTE_DEFAULT, PHASE_START } from "../constants";
import { useTickerDataContext } from "context/TickerDataContext";
import { useTickerActionsContext } from "context/TickerActionsContext";
import type { MatchEvent, TickerEntry } from "../../../types";

type PublishedEntryItem =
  | { key: string; minute: number; type: "manual"; data: TickerEntry }
  | {
      key: string;
      minute: number;
      type: "event";
      data: { event: MatchEvent; tickerText: TickerEntry };
    };

const sortMinute = (t: TickerEntry) => {
  if (!t.phase) return t.minute ?? 0;
  const ps = PHASE_SORT[t.phase];
  return ps !== null ? ps : (t.minute ?? PHASE_MINUTE_DEFAULT[t.phase] ?? 0);
};

export const LeftPanel = memo(function LeftPanel() {
  const { match, events, tickerTexts } = useTickerDataContext();
  const { onEditEntry, onDeleteEntry } = useTickerActionsContext();

  const allEntries = useMemo(() => {
    // Deduplicate: if multiple ticker entries share the same event_id (race-condition
    // duplicates from parallel n8n imports), keep only the one with the highest id.
    const publishedAll = tickerTexts.filter(
      (t) => t.status === "published" || t.status == null,
    );
    const latestByEventId = new Map();
    for (const t of publishedAll) {
      if (!t.event_id || t.video_url) continue; // Video-Einträge nicht deduplizieren
      const prev = latestByEventId.get(t.event_id);
      if (!prev || t.id > prev.id) latestByEventId.set(t.event_id, t);
    }
    const publishedTexts = publishedAll.filter(
      (t) => !t.event_id || !!t.video_url || latestByEventId.get(t.event_id)?.id === t.id,
    );

    const manualEntries = publishedTexts
      .filter((t) => !t.event_id || !!t.video_url) // Video-Einträge als manual rendern
      .map((t) => ({
        key: `man-${t.id}`,
        minute: sortMinute(t),
        type: "manual" as const,
        data: t,
      }));

    const eventEntries: PublishedEntryItem[] = events.flatMap((ev) => {
      const tt = publishedTexts.find((t) => t.event_id === ev.id && !t.video_url);
      if (!tt) return [];
      return [
        {
          key: `ev-${ev.id}`,
          minute: tt.minute ?? ev.time ?? 0,
          type: "event" as const,
          data: { event: ev, tickerText: tt },
        },
      ];
    });

    return ([...manualEntries, ...eventEntries]).sort(
      (a, b) => {
        if (b.minute !== a.minute) return b.minute - a.minute;
        const aPhase =
          a.type === "manual" ? a.data.phase : a.data.tickerText.phase;
        const bPhase =
          b.type === "manual" ? b.data.phase : b.data.tickerText.phase;
        if (PHASE_START.has(aPhase) && !PHASE_START.has(bPhase)) return 1;
        if (!PHASE_START.has(aPhase) && PHASE_START.has(bPhase)) return -1;
        // 🎬 Video-Einträge vor Text-Einträgen (auch bei leicht unterschiedlicher Minute)
        const aIsVideo = a.type === "manual" && a.data.icon === "🎬";
        const bIsVideo = b.type === "manual" && b.data.icon === "🎬";
        if (aIsVideo && !bIsVideo) return 1;
        if (!aIsVideo && bIsVideo) return -1;
        // created_at: ältere Einträge zuerst (Video wird vor LLM-Text erstellt)
        const aTime =
          a.type === "manual"
            ? a.data.created_at
            : a.data.tickerText.created_at;
        const bTime =
          b.type === "manual"
            ? b.data.created_at
            : b.data.tickerText.created_at;
        if (aTime && bTime)
          return new Date(aTime).getTime() - new Date(bTime).getTime();
        return 0;
      },
    );
  }, [tickerTexts, events]);

  const hasContent = allEntries.length > 0;

  return (
    <div className="lt-col lt-col--ticker">
      <div className="lt-left__header">
        <span>Veröffentlichte Einträge</span>
        <span className="lt-left__count">{allEntries.length}</span>
      </div>

      {!match && (
        <div className="lt-empty">
          <div className="lt-empty__icon">📋</div>
          Kein Spiel ausgewählt
        </div>
      )}

      {match && !hasContent && (
        <div className="lt-empty">
          <div className="lt-empty__icon">⏳</div>
          Noch keine Einträge
        </div>
      )}

      {allEntries.map((entry) => {
        if (entry.type === "manual") {
          return (
            <PublishedEntry
              key={entry.key}
              tickerText={entry.data}
              isManual={true}
              onEdit={onEditEntry}
              onDelete={onDeleteEntry}
            />
          );
        }
        if (entry.type === "event") {
          return (
            <PublishedEntry
              key={entry.key}
              entry={entry.data.event}
              tickerText={entry.data.tickerText}
              onEdit={onEditEntry}
              onDelete={onDeleteEntry}
            />
          );
        }
        return null;
      })}
    </div>
  );
});

// match, events, tickerTexts → via TickerDataContext
// onEditEntry, onDeleteEntry → via TickerActionsContext
// No props required.
