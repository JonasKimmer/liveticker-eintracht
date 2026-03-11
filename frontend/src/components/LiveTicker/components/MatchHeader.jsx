// ============================================================
// MatchHeader.jsx
// ============================================================
import { useState, useEffect } from "react";
import { normalizeMatchStatus } from "../utils/parseCommand";
import config from "../../../config/whitelabel";

const HEALTH_URL = config.apiBase.split("/api")[0] + "/health";

function useApiStatus() {
  const [apiStatus, setApiStatus] = useState("checking"); // "ok" | "degraded" | "offline" | "checking"

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const res = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(4000) });
        if (cancelled) return;
        if (!res.ok) { setApiStatus("offline"); return; }
        const data = await res.json().catch(() => null);
        setApiStatus(data?.status === "healthy" ? "ok" : data?.status === "degraded" ? "degraded" : "ok");
      } catch {
        if (!cancelled) setApiStatus("offline");
      }
    }
    check();
    const id = setInterval(check, 30000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  return apiStatus;
}

const API_STATUS_CFG = {
  checking: { dot: "#6b7385", label: "Verbinde…" },
  ok:       { dot: "#22c55e", label: "Bereit" },
  degraded: { dot: "#f59e0b", label: "Degradiert" },
  offline:  { dot: "#ef4444", label: "Offline" },
};

export function MatchHeader({ match, leagueSeason }) {
  const apiStatus = useApiStatus();
  const apiCfg    = API_STATUS_CFG[apiStatus];

  if (!match || !match.homeTeam || !match.awayTeam) return null;

  const status = normalizeMatchStatus(match.matchState);
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
          </div>
        </div>
      </div>

      <div className="lt-match-header__meta">
        {(leagueSeason?.league?.name || leagueSeason?.season?.year) && (
          <span>{leagueSeason?.league?.name} {leagueSeason?.season?.year}</span>
        )}
        <span className="lt-match-header__api-status">
          <span className="lt-match-header__api-dot" style={{ background: apiCfg.dot }} />
          API: {apiCfg.label}
        </span>
      </div>
    </div>
  );
}
