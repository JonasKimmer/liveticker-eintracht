// ============================================================
// MatchHeader.jsx
// ============================================================
import { memo, useEffect } from "react";
import { normalizeMatchStatus } from "../../../utils/matchStatus";
import { useLiveMinute } from "../hooks/useLiveMinute";
import { SYNC_MATCH_INTERVAL_MS } from "../constants";
import * as api from "api";
import logger from "utils/logger";

import type { Match, Competition } from "../../../types";

interface MatchHeaderProps {
  match: Match;
  leagueSeason?: Competition | null;
  onMinuteSync?: () => void;
}

export const MatchHeader = memo(function MatchHeader({
  match,
  leagueSeason,
  onMinuteSync,
}: MatchHeaderProps) {
  const status = normalizeMatchStatus(match?.matchState);
  const liveMinute = useLiveMinute(match);

  useEffect(() => {
    if (status !== "live" || !match?.id) return;
    const sync = () =>
      api
        .syncMatchLive(match.id)
        .then(() => onMinuteSync?.())
        .catch((e) => logger.warn("[MatchHeader] sync-live error", e));
    sync();
    const id = setInterval(sync, SYNC_MATCH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [status, match?.id, onMinuteSync]);

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
            <div className="lt-match-header__team-name">
              {match.homeTeam.name}
            </div>
          </div>
        </div>

        {/* Score */}
        <div className="lt-match-header__score-wrap">
          <span
            className={`lt-match-header__status lt-match-header__status--${status}`}
          >
            {status === "live"
              ? ["FirstHalfBreak", "HalfTime", "ExtraBreak"].includes(
                  match.matchPhase,
                )
                ? "HZ"
                : liveMinute > 0
                  ? `${liveMinute}'`
                  : match.matchState
              : match.matchState}
          </span>
          <div className="lt-match-header__scores-row">
            <span className="lt-match-header__score">
              {match.teamHomeScore}
            </span>
            <span className="lt-match-header__score-sep">–</span>
            <span className="lt-match-header__score">
              {match.teamAwayScore}
            </span>
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
            <div className="lt-match-header__team-name">
              {match.awayTeam.name}
            </div>
          </div>
        </div>
      </div>

      {leagueSeason?.title && (
        <div className="lt-match-header__meta">
          <span>{leagueSeason.title}</span>
        </div>
      )}
    </div>
  );
});
