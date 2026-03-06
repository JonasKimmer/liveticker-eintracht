import { memo } from "react";
import { PublishedEntry } from "../components/PublishedEntry";

export const LeftPanel = memo(function LeftPanel({
  events,
  tickerTexts,
  match,
}) {
  const publishedTexts = tickerTexts.filter(
    (t) => t.status === "published" || t.status == null,
  );

  // Alle Einträge in eine gemeinsame Liste zusammenführen und nach Minute sortieren
  const allEntries = [
    // Manuelle Einträge (event_id === null)
    ...publishedTexts
      .filter((t) => !t.event_id)
      .map((t) => ({
        key: `man-${t.id}`,
        minute: t.minute ?? 0,
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
    <div className="lt-col lt-col--left">
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
            <PublishedEntry key={entry.key} tickerText={entry.data} isManual />
          );
        }
        if (entry.type === "event") {
          return (
            <PublishedEntry
              key={entry.key}
              entry={entry.data.event}
              tickerText={entry.data.tickerText}
            />
          );
        }
        return null;
      })}
    </div>
  );
});
