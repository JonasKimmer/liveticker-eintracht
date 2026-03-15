import { memo } from "react";
import { PublishedEntry } from "../components/PublishedEntry";

export const LeftPanel = memo(function LeftPanel({
  events,
  tickerTexts,
  match,
  onEditEntry,
  onDeleteEntry,
}) {
  const publishedTexts = tickerTexts.filter(
    (t) => t.status === "published" || t.status == null,
  );

  // Phasen-Reihenfolge für Sortierung
  const PHASE_SORT = {
    Before: -1, FirstHalf: null, FirstHalfBreak: 45.5,
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
  const sortMinute = (t) => {
    if (!t.phase) return t.minute ?? 0;
    const ps = PHASE_SORT[t.phase];
    return ps !== null ? ps : (t.minute ?? PHASE_MINUTE_DEFAULT[t.phase] ?? 0);
  };

  // Alle Einträge in eine gemeinsame Liste zusammenführen und nach Minute sortieren
  const allEntries = [
    // Manuelle + AI-Phasen-Einträge (kein event_id)
    ...publishedTexts
      .filter((t) => !t.event_id)
      .map((t) => ({
        key: `man-${t.id}`,
        minute: sortMinute(t),
        type: "manual",
        data: t,
      })),
    // Event-basierte Einträge (CO-OP / AUTO)
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
  ].sort((a, b) => b.minute - a.minute); // neueste Minute zuerst

  const hasContent = allEntries.length > 0;

  return (
    <div className="lt-col lt-col--ticker">
      <div className="lt-left__header">
        <span>Published Entries</span>
        <span className="lt-left__count">
          {allEntries.filter((e) => e.type !== "prematch").length}
        </span>
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
