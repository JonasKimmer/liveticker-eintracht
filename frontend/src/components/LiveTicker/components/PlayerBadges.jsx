import { memo } from "react";
import PropTypes from "prop-types";

export const PlayerBadges = memo(function PlayerBadges({ entry, stat, subMinuteMap = {} }) {
  const goals  = stat?.goals      ?? entry.numberOfGoals ?? 0;
  const yellow = stat?.cardsYellow > 0 || entry.hasYellowCard;
  const red    = stat?.cardsRed    > 0 || entry.hasRedCard;
  const subOff = entry.isSubstituted || (entry.status === "Start" && stat?.minutes != null && stat.minutes < 85);
  const subOffMin = subMinuteMap[entry.playerId] ?? stat?.minutes ?? null;
  const subOnMin  = subMinuteMap[`in_${entry.playerId}`] ?? null;
  const subOn  = entry.status === "Sub" && (stat?.minutes > 0 || subOnMin != null);
  if (!goals && !yellow && !red && !subOff && !subOn) return null;
  return (
    <span className="lt-lineup-badges">
      {goals > 0 && Array.from({ length: goals }).map((_, i) => (
        <span key={`g${i}`} className="lt-lineup-badge">⚽</span>
      ))}
      {yellow && <span className="lt-lineup-badge">🟨</span>}
      {red    && <span className="lt-lineup-badge">🟥</span>}
      {subOff && <span className="lt-lineup-badge lt-lineup-badge--out" title="Ausgewechselt">↓{subOffMin ? `${subOffMin}'` : ""}</span>}
      {subOn  && <span className="lt-lineup-badge lt-lineup-badge--in"  title="Eingewechselt">↑{subOnMin ? `${subOnMin}'` : ""}</span>}
    </span>
  );
});

PlayerBadges.propTypes = {
  entry: PropTypes.shape({
    playerId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    numberOfGoals: PropTypes.number,
    hasYellowCard: PropTypes.bool,
    hasRedCard: PropTypes.bool,
    isSubstituted: PropTypes.bool,
    status: PropTypes.string,
  }).isRequired,
  stat: PropTypes.shape({
    goals: PropTypes.number,
    cardsYellow: PropTypes.number,
    cardsRed: PropTypes.number,
    minutes: PropTypes.number,
    rating: PropTypes.number,
  }),
  subMinuteMap: PropTypes.object,
};
