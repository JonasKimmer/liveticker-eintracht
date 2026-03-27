import PropTypes from "prop-types";
import { EventCard } from "./EventCard";
import { useTickerDataContext } from "../../../context/TickerDataContext";

/**
 * AUTO-Modus: Info-Banner, optionaler Fehler-Toast und Warteschlange.
 *
 * @param {object}      props
 * @param {Array}       props.pendingEvents - Events ohne publizierten Ticker
 * @param {string|null} props.autoError     - Fehlertext oder null
 */
export function AutoModePanel({ pendingEvents, autoError }) {
  const { tickerTexts } = useTickerDataContext();
  return (
    <>
      <div className="lt-center__auto-info">
        <div className="lt-center__auto-dot" />
        AI generiert und veröffentlicht Einträge automatisch.
      </div>
      {autoError && (
        <div
          style={{
            marginTop: "0.5rem",
            borderRadius: 6,
            padding: "0.4rem 0.75rem",
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            fontFamily: "var(--lt-font-mono)",
            fontSize: "0.7rem",
            color: "#f87171",
          }}
        >
          ⚠ {autoError}
        </div>
      )}
      {pendingEvents.length > 0 && (
        <div style={{ marginTop: "1rem" }}>
          <div className="lt-center__section-title">
            Warteschlange ({pendingEvents.length})
          </div>
          {pendingEvents.map((ev) => (
            <EventCard
              key={ev.id}
              event={ev}
              draft={tickerTexts.find((t) => t.event_id === ev.id)}
            />
          ))}
        </div>
      )}
    </>
  );
}

AutoModePanel.propTypes = {
  pendingEvents: PropTypes.array.isRequired,
  autoError: PropTypes.string,
};
