import { memo, useMemo } from "react";
import PropTypes from "prop-types";
import { PublishedEntry } from "../components/PublishedEntry";
import { PHASE_SORT, PHASE_MINUTE_DEFAULT, PHASE_START } from "../constants";

const sortMinute = (t) => {
  if (!t.phase) return t.minute ?? 0;
  const ps = PHASE_SORT[t.phase];
  return ps !== null ? ps : (t.minute ?? PHASE_MINUTE_DEFAULT[t.phase] ?? 0);
};

export const LeftPanel = memo(function LeftPanel({
  events,
  tickerTexts,
  match,
  onEditEntry,
  onDeleteEntry,
}) {
  const allEntries = useMemo(() => {
    // Deduplicate: if multiple ticker entries share the same event_id (race-condition
    // duplicates from parallel n8n imports), keep only the one with the highest id.
    const publishedAll = tickerTexts.filter(
      (t) => t.status === "published" || t.status == null,
    );
    const latestByEventId = new Map();
    for (const t of publishedAll) {
      if (!t.event_id) continue;
      const prev = latestByEventId.get(t.event_id);
      if (!prev || t.id > prev.id) latestByEventId.set(t.event_id, t);
    }
    const publishedTexts = publishedAll.filter(
      (t) => !t.event_id || latestByEventId.get(t.event_id)?.id === t.id,
    );

    const manualEntries = publishedTexts
      .filter((t) => !t.event_id)
      .map((t) => ({
        key: `man-${t.id}`,
        minute: sortMinute(t),
        type: "manual",
        data: t,
      }));

    return [
      ...manualEntries,
      ...events
        .map((ev) => {
          const tt = publishedTexts.find((t) => t.event_id === ev.id);
          if (!tt) return null;
          return {
            key: `ev-${ev.id}`,
            minute: ev.time ?? 0,
            type: "event",
            data: { event: ev, tickerText: tt },
          };
        })
        .filter(Boolean),
    ].sort((a, b) => {
      if (b.minute !== a.minute) return b.minute - a.minute;
      const aPhase = a.type === "manual" ? a.data?.phase : a.data?.tickerText?.phase;
      const bPhase = b.type === "manual" ? b.data?.phase : b.data?.tickerText?.phase;
      if (PHASE_START.has(aPhase) && !PHASE_START.has(bPhase)) return 1;
      if (!PHASE_START.has(aPhase) && PHASE_START.has(bPhase)) return -1;
      // 🎬 Video-Einträge vor Text-Einträgen (auch bei leicht unterschiedlicher Minute)
      const aIsVideo = a.type === "manual" && a.data?.icon === "🎬";
      const bIsVideo = b.type === "manual" && b.data?.icon === "🎬";
      if (aIsVideo && !bIsVideo) return 1;
      if (!aIsVideo && bIsVideo) return -1;
      // created_at: ältere Einträge zuerst (Video wird vor LLM-Text erstellt)
      const aTime = a.type === "manual" ? a.data?.created_at : a.data?.tickerText?.created_at;
      const bTime = b.type === "manual" ? b.data?.created_at : b.data?.tickerText?.created_at;
      if (aTime && bTime) return new Date(aTime) - new Date(bTime);
      return 0;
    });
  }, [tickerTexts, events]);

  const hasContent = allEntries.length > 0;

  return (
    <div className="lt-col lt-col--ticker">
      <div className="lt-left__header">
        <span>Published Entries</span>
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
            <PublishedEntry key={entry.key} tickerText={entry.data} isManual onEdit={onEditEntry} onDelete={onDeleteEntry} />
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

LeftPanel.propTypes = {
  events: PropTypes.arrayOf(PropTypes.object).isRequired,
  tickerTexts: PropTypes.arrayOf(PropTypes.object).isRequired,
  match: PropTypes.object,
  onEditEntry: PropTypes.func.isRequired,
  onDeleteEntry: PropTypes.func.isRequired,
};
