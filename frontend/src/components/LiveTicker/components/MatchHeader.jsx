// ============================================================
// MatchHeader.jsx
// ============================================================
import React from "react";
import { normalizeMatchStatus } from "../utils/parseCommand";

export function MatchHeader({ match, leagueSeason, favorites, onToggleFav }) {
  if (!match) return null;

  const status = normalizeMatchStatus(match.status);
  const isFavHome = favorites.some((f) => f.team_id === match.home_team_id);
  const isFavAway = favorites.some((f) => f.team_id === match.away_team_id);
  const homeAbbr = match.home_team.name.substring(0, 3).toUpperCase();
  const awayAbbr = match.away_team.name.substring(0, 3).toUpperCase();

  return (
    <div className="lt-match-header">
      <div className="lt-match-header__scores">
        {/* Home */}
        <div className="lt-match-header__team lt-match-header__team--home">
          <div>
            <div className="lt-match-header__team-abbr">{homeAbbr}</div>
            <div className="lt-match-header__team-name">
              {match.home_team.name}
            </div>
          </div>
          <button
            className="lt-match-header__fav"
            onClick={() => onToggleFav(match.home_team_id)}
          >
            {isFavHome ? "⭐" : "☆"}
          </button>
        </div>

        {/* Score */}
        <div className="lt-match-header__score-wrap">
          <span className="lt-match-header__score">{match.score_home}</span>
          <span className="lt-match-header__score-sep">–</span>
          <span className="lt-match-header__score">{match.score_away}</span>
        </div>

        {/* Away */}
        <div className="lt-match-header__team lt-match-header__team--away">
          <button
            className="lt-match-header__fav"
            onClick={() => onToggleFav(match.away_team_id)}
          >
            {isFavAway ? "⭐" : "☆"}
          </button>
          <div>
            <div className="lt-match-header__team-abbr">{awayAbbr}</div>
            <div className="lt-match-header__team-name">
              {match.away_team.name}
            </div>
          </div>
        </div>
      </div>

      <div className="lt-match-header__meta">
        <span>
          {leagueSeason?.league?.name} {leagueSeason?.season?.year}
        </span>
        <span className="lt-match-header__meta-sep">·</span>
        <span>{match.round}</span>
        <span className="lt-match-header__meta-sep">·</span>
        <span
          className={`lt-match-header__status lt-match-header__status--${status}`}
        >
          {match.status}
          {match.minute ? ` ${match.minute}'` : ""}
        </span>
      </div>
    </div>
  );
}
