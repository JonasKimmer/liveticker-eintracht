// ============================================================
// PublishedEntry.jsx  (React.memo — rendert oft)
// ============================================================
import { memo } from "react";
import { getEventMeta } from "../utils/parseCommand";

export const PublishedEntry = memo(function PublishedEntry({
  entry,
  tickerText,
  isManual,
  isPrematch,
}) {
  const eventType = entry?.liveTickerEventType ?? entry?.event_type ?? entry?.type;
  const { icon, cssClass } = getEventMeta(eventType, entry?.detail);

  if (isPrematch) {
    return (
      <div className="lt-entry lt-entry--pre">
        <span className="lt-entry__minute lt-entry__minute--pre">Vor</span>
        <span className="lt-entry__icon">📋</span>
        <div className="lt-entry__body">
          <div className="lt-entry__text">{tickerText?.text}</div>
          <div className="lt-entry__meta">{tickerText?.llm_model}</div>
        </div>
      </div>
    );
  }

  if (isManual) {
    return (
      <div className="lt-entry lt-entry--manual">
        <span className="lt-entry__minute">{tickerText?.minute}'</span>
        <span className="lt-entry__icon">{tickerText?.icon ?? "📝"}</span>
        <div className="lt-entry__body">
          <div className="lt-entry__text">{tickerText?.text}</div>
          <div className="lt-entry__meta">manuell</div>
        </div>
      </div>
    );
  }

  if (!tickerText) return null;

  return (
    <div className={`lt-entry${cssClass ? ` lt-entry--${cssClass}` : ""}`}>
      <span className="lt-entry__minute">{entry.time ?? entry.minute}'</span>
      <span className="lt-entry__icon">{icon}</span>
      <div className="lt-entry__body">
        <div className="lt-entry__text">{tickerText.text}</div>
        <div className="lt-entry__meta">
          {tickerText.style} · {tickerText.llm_model}
        </div>
      </div>
    </div>
  );
});
