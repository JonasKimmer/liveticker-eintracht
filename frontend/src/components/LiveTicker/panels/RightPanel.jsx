// ============================================================
// panels/RightPanel.jsx
// Stats, Aufstellung, Top Spieler
// ============================================================
import React from "react";

export function RightPanel({ match, matchStats, playerStats, lineups }) {
  if (!match) {
    return (
      <div className="lt-col lt-col--right">
        <div className="lt-empty">
          <div className="lt-empty__icon">📊</div>
          Kein Spiel ausgewählt
        </div>
      </div>
    );
  }

  const homeStats = matchStats.find((s) => s.teamId === match.teamHomeId);
  const awayStats = matchStats.find((s) => s.teamId === match.teamAwayId);
  const homeLineup = lineups.filter(
    (l) => l.teamId === match.teamHomeId && l.status === "Start",
  );
  const awayLineup = lineups.filter(
    (l) => l.teamId === match.teamAwayId && l.status === "Start",
  );
  const topPlayers = [...playerStats]
    .filter((p) => p.rating)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 5);

  if (!match.homeTeam || !match.awayTeam) return null;
  const homeAbbr = match.homeTeam.name.substring(0, 3).toUpperCase();
  const awayAbbr = match.awayTeam.name.substring(0, 3).toUpperCase();

  return (
    <div className="lt-col lt-col--right">
      {/* Statistiken */}
      {homeStats && awayStats && (
        <div className="lt-right__section">
          <div className="lt-right__section-title">📊 Statistiken</div>

          {/* Ballbesitz mit Bar */}
          <StatRow
            label="Ballbesitz"
            home={`${homeStats.possessionPercentage}%`}
            away={`${awayStats.possessionPercentage}%`}
          />
          <div className="lt-stat-bar">
            <div
              className="lt-stat-bar__home"
              style={{ width: `${homeStats.possessionPercentage}%` }}
            />
            <div
              className="lt-stat-bar__away"
              style={{ width: `${awayStats.possessionPercentage}%` }}
            />
          </div>

          {[
            ["Schüsse", homeStats.goalScoringAttempt, awayStats.goalScoringAttempt],
            ["aufs Tor", homeStats.goalOnTargetScoringAttempt, awayStats.goalOnTargetScoringAttempt],
            ["Pässe", homeStats.totalPass, awayStats.totalPass],
            ["Ecken", homeStats.cornerTaken, awayStats.cornerTaken],
            ["Fouls", homeStats.fouls, awayStats.fouls],
            ["Abseits", homeStats.totalOffside, awayStats.totalOffside],
          ].map(([lbl, h, a]) => (
            <StatRow key={lbl} label={lbl} home={h} away={a} />
          ))}
        </div>
      )}

      {/* Top Spieler */}
      {topPlayers.length > 0 && (
        <div className="lt-right__section">
          <div className="lt-right__section-title">⭐ Beste Spieler</div>
          {topPlayers.map((p, i) => (
            <div key={p.id} className="lt-player">
              <span className="lt-player__rank">#{i + 1}</span>
              <div className="lt-player__info">
                <div className="lt-player__name">
                  {p.player_name}
                  {p.captain ? " ©" : ""}
                </div>
                <div className="lt-player__meta">
                  {p.position} · #{p.number} · {p.minutes_played}'
                </div>
              </div>
              <span className="lt-player__rating">{p.rating}</span>
            </div>
          ))}
        </div>
      )}

      {/* Aufstellungen */}
      {(homeLineup.length > 0 || awayLineup.length > 0) && (
        <div className="lt-right__section">
          <div className="lt-right__section-title">📋 Aufstellungen</div>
          <div className="lt-lineup-grid">
            <div>
              <div className="lt-lineup-team-label lt-lineup-team-label--home">
                {homeAbbr}
              </div>
              <div className="lt-lineup-formation">
                {homeLineup[0]?.formation}
              </div>
              <ul className="lt-lineup-list">
                {homeLineup.map((p) => (
                  <li key={p.id}>
                    <span className="lt-lineup-num">#{p.jerseyNumber}</span>
                    <span>{p.position}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="lt-lineup-team-label lt-lineup-team-label--away">
                {awayAbbr}
              </div>
              <div className="lt-lineup-formation">
                {awayLineup[0]?.formation}
              </div>
              <ul className="lt-lineup-list">
                {awayLineup.map((p) => (
                  <li key={p.id}>
                    <span className="lt-lineup-num">#{p.jerseyNumber}</span>
                    <span>{p.position}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatRow({ label, home, away }) {
  return (
    <div className="lt-stat-row">
      <span className="lt-stat-val lt-stat-val--home">{home}</span>
      <span className="lt-stat-lbl">{label}</span>
      <span className="lt-stat-val lt-stat-val--away">{away}</span>
    </div>
  );
}
