import { memo, useMemo } from "react";
import { PublishedEntry } from "../components/PublishedEntry";

// Phasen-Reihenfolge für Sortierung (außerhalb Komponente — unveränderlich)
const PHASE_SORT = {
  Before: -1, FirstHalf: null, FirstHalfBreak: 45.5, Halftime: 45.5,
  SecondHalf: null, SecondHalfBreak: 90.5,
  ExtraFirstHalf: null, ExtraBreak: 105.5,
  ExtraSecondHalf: null, ExtraSecondHalfBreak: 120.5,
  PenaltyShootout: null, After: 999,
};
// Fallback-Minuten wenn minute: null aber Phase bekannt
const PHASE_MINUTE_DEFAULT = {
  FirstHalf: 1, SecondHalf: 46,
  ExtraFirstHalf: 91, ExtraSecondHalf: 106, PenaltyShootout: 121,
};
const PHASE_START = new Set(["FirstHalf", "SecondHalf", "ExtraFirstHalf", "ExtraSecondHalf", "PenaltyShootout"]);

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
    const publishedTexts = tickerTexts.filter(
      (t) => t.status === "published" || t.status == null,
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
