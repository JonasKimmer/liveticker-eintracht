// ============================================================
// MatchHeader.jsx
// ============================================================
import React from "react";
import { normalizeMatchStatus } from "../utils/parseCommand";

export function MatchHeader({ match, leagueSeason, favorites, onToggleFav }) {
  if (!match || !match.homeTeam || !match.awayTeam) return null;

  const status = normalizeMatchStatus(match.matchState);
  const isFavHome = favorites.some((f) => f.team_id === match.teamHomeId);
  const isFavAway = favorites.some((f) => f.team_id === match.teamAwayId);
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
            <button
              className="lt-match-header__fav"
              onClick={() => onToggleFav(match.teamHomeId)}
            >
              {isFavHome ? "⭐" : "☆"}
            </button>
          </div>
        </div>

        {/* Score */}
        <div className="lt-match-header__score-wrap">
          <span className={`lt-match-header__status lt-match-header__status--${status}`}>
            {match.matchState}
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
            <button
              className="lt-match-header__fav"
              onClick={() => onToggleFav(match.teamAwayId)}
            >
              {isFavAway ? "⭐" : "☆"}
            </button>
          </div>
        </div>
      </div>

      {(leagueSeason?.league?.name || leagueSeason?.season?.year) && (
        <div className="lt-match-header__meta">
          <span>
            {leagueSeason?.league?.name} {leagueSeason?.season?.year}
          </span>
        </div>
      )}
    </div>
  );
}
