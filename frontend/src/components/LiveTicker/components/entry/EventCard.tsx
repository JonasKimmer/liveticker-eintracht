import { memo, useState } from "react";
import { getEventMeta, getRawEventText } from "../../utils/parseCommand";
import type { MatchEvent, TickerEntry } from "../../../../types";

interface EventCardProps {
  event: MatchEvent;
  draft?: TickerEntry | null;
  isSelected?: boolean;
  onSelect?: () => void;
  onDismiss?: () => void;
}

export const EventCard = memo(function EventCard({
  event,
  draft,
  isSelected,
  onSelect,
  onDismiss,
}: EventCardProps) {
  const { icon, cssClass } = getEventMeta(event.liveTickerEventType, null);
  const [confirmDismiss, setConfirmDismiss] = useState(false);

  return (
    <div
      className={`lt-event-card lt-event-card--${cssClass}${isSelected ? " lt-event-card--selected" : ""}`}
      onClick={onSelect}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
    >
      <div className="lt-event-card__row">
        <span className="lt-event-card__minute">{event.time}'</span>
        <span className="lt-event-card__icon">{icon}</span>
        <span className="lt-event-card__raw">
          {draft?.text ?? getRawEventText(event)}
        </span>
        {onDismiss && !confirmDismiss && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setConfirmDismiss(true);
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
      </div>
      {confirmDismiss && (
        <div
          className="lt-delete-confirm"
          style={{ marginTop: "0.4rem" }}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="lt-delete-confirm__label">Ablehnen?</span>
          <button
            className="lt-delete-confirm__btn lt-delete-confirm__btn--ok"
            onClick={() => {
              onDismiss();
              setConfirmDismiss(false);
            }}
          >
            Ja
          </button>
          <button
            className="lt-delete-confirm__btn lt-delete-confirm__btn--cancel"
            onClick={() => setConfirmDismiss(false)}
          >
            Nein
          </button>
        </div>
      )}
    </div>
  );
});
