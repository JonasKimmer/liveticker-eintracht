// ============================================================
// MatchHeader.jsx
// ============================================================
import { memo, useEffect } from "react";
import PropTypes from "prop-types";
import { normalizeMatchStatus } from "../utils/parseCommand";
import { useLiveMinute } from "../../../hooks/useLiveMinute";
import * as api from "../../../api";
import logger from "../../../utils/logger";

export const MatchHeader = memo(function MatchHeader({ match, leagueSeason, onMinuteSync }) {
  const status = normalizeMatchStatus(match?.matchState);
  const liveMinute = useLiveMinute(match);

  useEffect(() => {
    if (status !== "live" || !match?.externalId) return;
    const sync = () =>
      api.triggerMinuteUpdate(match.externalId)
        .then(() => onMinuteSync?.())
        .catch((e) => logger.warn("[MatchHeader] sync error", e));
    sync();
    const id = setInterval(sync, 60000);
    return () => clearInterval(id);
  }, [status, match?.externalId, onMinuteSync]);

  if (!match || !match.homeTeam || !match.awayTeam) return null;
  const homeAbbr = match.homeTeam.name.substring(0, 3).toUpperCase();
  const awayAbbr = match.awayTeam.name.substring(0, 3).toUpperCase();

  return (
    <div className="lt-match-header">
      <div className="lt-match-header__scores">
        {/* Home */}
        <div className="lt-match-header__team lt-match-header__team--home">
          <div className="lt-match-header__team-inner">
            {match.homeTeam.logoUrl ? (
              <img
                className="lt-match-header__team-logo"
                src={match.homeTeam.logoUrl}
                alt={match.homeTeam.name}
              />
            ) : (
              <div className="lt-match-header__team-abbr">{homeAbbr}</div>
            )}
            <div className="lt-match-header__team-name">{match.homeTeam.name}</div>
          </div>
        </div>

        {/* Score */}
        <div className="lt-match-header__score-wrap">
          <span className={`lt-match-header__status lt-match-header__status--${status}`}>
            {status === "live"
              ? (["FirstHalfBreak", "HalfTime", "ExtraBreak"].includes(match.matchPhase)
                  ? "HZ"
                  : liveMinute > 0 ? `${liveMinute}'` : match.matchState)
              : match.matchState}
          </span>
          <div className="lt-match-header__scores-row">
            <span className="lt-match-header__score">{match.teamHomeScore}</span>
            <span className="lt-match-header__score-sep">–</span>
            <span className="lt-match-header__score">{match.teamAwayScore}</span>
          </div>
        </div>

        {/* Away */}
        <div className="lt-match-header__team lt-match-header__team--away">
          <div className="lt-match-header__team-inner">
            {match.awayTeam.logoUrl ? (
              <img
                className="lt-match-header__team-logo"
                src={match.awayTeam.logoUrl}
                alt={match.awayTeam.name}
              />
            ) : (
              <div className="lt-match-header__team-abbr">{awayAbbr}</div>
            )}
            <div className="lt-match-header__team-name">{match.awayTeam.name}</div>
          </div>
        </div>
      </div>

      {(leagueSeason?.league?.name || leagueSeason?.season?.year) && (
        <div className="lt-match-header__meta">
          <span>{leagueSeason?.league?.name} {leagueSeason?.season?.year}</span>
        </div>
      )}
    </div>
  );
});

MatchHeader.propTypes = {
  match: PropTypes.shape({
    externalId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    matchState: PropTypes.string,
    matchPhase: PropTypes.string,
    homeTeam: PropTypes.shape({
      name: PropTypes.string.isRequired,
      logoUrl: PropTypes.string,
    }),
    awayTeam: PropTypes.shape({
      name: PropTypes.string.isRequired,
      logoUrl: PropTypes.string,
    }),
    teamHomeScore: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    teamAwayScore: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }),
  leagueSeason: PropTypes.shape({
    league: PropTypes.shape({ name: PropTypes.string }),
    season: PropTypes.shape({ year: PropTypes.oneOfType([PropTypes.string, PropTypes.number]) }),
  }),
  onMinuteSync: PropTypes.func,
};
