// ============================================================
// Breadcrumb.jsx
// Zeigt: Liga › Saison › Spieltag › Heim vs Gast
// Klick → onOpen() öffnet MatchSelectorModal
// ============================================================
import { memo, Fragment, useMemo } from "react";
import PropTypes from "prop-types";
import { makeRoundLabel } from "../../../utils/roundLabel";

export const Breadcrumb = memo(function Breadcrumb({ match, competition, country, team, round, matchdays, onOpen }) {
  const { full } = useMemo(() => makeRoundLabel(matchdays ?? []), [matchdays]);

  if (!match || !competition) return null;

  const roundLabel = round ? full(round) : null;

  const segments = [
    { value: country,            cls: "country" },
    { value: team?.name,         cls: "team" },
    { value: competition.title,  cls: "competition" },
    { value: roundLabel,         cls: "round" },
  ].filter(({ value }) => value);

  return (
    <button className="lt-breadcrumb" onClick={onOpen} title="Match wechseln">
      {segments.map(({ value, cls }) => (
        <Fragment key={cls}>
          <span className={`lt-breadcrumb__seg lt-breadcrumb__seg--${cls}`}>{value}</span>
          <span className="lt-breadcrumb__sep">›</span>
        </Fragment>
      ))}
      <span className="lt-breadcrumb__seg lt-breadcrumb__seg--match">
        {match.homeTeam?.name} vs {match.awayTeam?.name}
      </span>
      <span className="lt-breadcrumb__edit">✎</span>
    </button>
  );
});

Breadcrumb.propTypes = {
  match: PropTypes.shape({
    homeTeam: PropTypes.shape({ name: PropTypes.string }),
    awayTeam: PropTypes.shape({ name: PropTypes.string }),
  }),
  competition: PropTypes.shape({
    title: PropTypes.string.isRequired,
  }),
  country: PropTypes.string,
  team: PropTypes.shape({
    name: PropTypes.string,
  }),
  round: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  matchdays: PropTypes.arrayOf(PropTypes.number),
  onOpen: PropTypes.func,
};
