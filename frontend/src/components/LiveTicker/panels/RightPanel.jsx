// ============================================================
// panels/RightPanel.jsx
// Stats, Aufstellung, Torschützen, Karten, Kader
// ============================================================

export function RightPanel({
  match,
  matchStats,
  players,
  playerStats = [],
  lineups,
}) {
  if (!match) {
    return (
      <div className="lt-col lt-col--stats">
        <div className="lt-empty">
          <div className="lt-empty__icon">📊</div>
          Kein Spiel ausgewählt
        </div>
      </div>
    );
  }

  const homeStats = matchStats.find((s) => s.teamId === match.teamHomeId);
  const awayStats = matchStats.find((s) => s.teamId === match.teamAwayId);
  const homeLineup = lineups.filter((l) => l.teamId === match.teamHomeId);
  const awayLineup = lineups.filter((l) => l.teamId === match.teamAwayId);

  const homeAbbr = match.homeTeam?.name.substring(0, 3).toUpperCase() ?? "HEI";
  const awayAbbr = match.awayTeam?.name.substring(0, 3).toUpperCase() ?? "GAS";

  const playerName = (playerId) => {
    if (playerId) {
      const p = players.find((pl) => pl.id === playerId);
      if (p) {
        return (
          p.knownName ||
          p.displayName ||
          `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() ||
          null
        );
      }
    }
    return null;
  };

  const topHome = playerStats
    .filter((s) => s.teamId === match.teamHomeId && s.rating != null)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 5)
    .map((s) => ({ ...s, resolvedName: playerName(s.playerId) }));
  const topAway = playerStats
    .filter((s) => s.teamId === match.teamAwayId && s.rating != null)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 5)
    .map((s) => ({ ...s, resolvedName: playerName(s.playerId) }));

  const topScorers = [...lineups]
    .filter((l) => l.numberOfGoals > 0)
    .sort((a, b) => b.numberOfGoals - a.numberOfGoals)
    .slice(0, 5)
    .map((l) => ({
      ...l,
      resolvedName: playerName(l.playerId),
      teamAbbr: l.teamId === match.teamHomeId ? homeAbbr : awayAbbr,
    }));

  const withCards = lineups
    .filter((l) => l.hasYellowCard || l.hasRedCard)
    .map((l) => ({
      ...l,
      resolvedName: playerName(l.playerId),
      teamAbbr: l.teamId === match.teamHomeId ? homeAbbr : awayAbbr,
    }));

  const homeStarters = homeLineup.filter((p) => p.status === "Start");
  const homeSubs = homeLineup.filter((p) => p.status === "Sub");
  const awayStarters = awayLineup.filter((p) => p.status === "Start");
  const awaySubs = awayLineup.filter((p) => p.status === "Sub");

  return (
    <div className="lt-col lt-col--stats">
      {/* 1. Statistiken */}
      {homeStats && awayStats && (
        <div className="lt-right__section">
          <div className="lt-right__section-title">📊 Statistiken</div>
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
            [
              "Schüsse",
              homeStats.goalScoringAttempt,
              awayStats.goalScoringAttempt,
            ],
            [
              "aufs Tor",
              homeStats.goalOnTargetScoringAttempt,
              awayStats.goalOnTargetScoringAttempt,
            ],
            ["Pässe", homeStats.totalPass, awayStats.totalPass],
            ["Ecken", homeStats.cornerTaken, awayStats.cornerTaken],
            ["Fouls", homeStats.fouls, awayStats.fouls],
            ["Abseits", homeStats.totalOffside, awayStats.totalOffside],
          ].map(([lbl, h, a]) => (
            <StatRow key={lbl} label={lbl} home={h} away={a} />
          ))}
        </div>
      )}

      {/* 2. Aufstellung */}
      {(homeLineup.length > 0 || awayLineup.length > 0) && (
        <div className="lt-right__section">
          <div className="lt-right__section-title">📋 Aufstellung</div>
          <div className="lt-lineup-grid">
            <FormationColumn
              lineup={homeStarters}
              playerName={playerName}
              abbr={homeAbbr}
              labelClass="lt-lineup-team-label--home"
            />
            <FormationColumn
              lineup={awayStarters}
              playerName={playerName}
              abbr={awayAbbr}
              labelClass="lt-lineup-team-label--away"
            />
          </div>
          {(homeSubs.length > 0 || awaySubs.length > 0) && (
            <>
              <div
                className="lt-right__section-title"
                style={{ marginTop: "12px" }}
              >
                🔄 Einwechslungen
              </div>
              <div className="lt-lineup-grid">
                <ul className="lt-lineup-list">
                  {homeSubs
                    .sort(
                      (a, b) => (a.jerseyNumber ?? 99) - (b.jerseyNumber ?? 99),
                    )
                    .map((p) => (
                      <li key={p.id}>
                        {p.jerseyNumber != null && (
                          <span className="lt-lineup-num">
                            #{p.jerseyNumber}
                          </span>
                        )}
                        <span>
                          {playerName(p.playerId) ??
                            `#${p.jerseyNumber ?? "?"}`}
                        </span>
                      </li>
                    ))}
                </ul>
                <ul className="lt-lineup-list">
                  {awaySubs
                    .sort(
                      (a, b) => (a.jerseyNumber ?? 99) - (b.jerseyNumber ?? 99),
                    )
                    .map((p) => (
                      <li key={p.id}>
                        {p.jerseyNumber != null && (
                          <span className="lt-lineup-num">
                            #{p.jerseyNumber}
                          </span>
                        )}
                        <span>
                          {playerName(p.playerId) ??
                            `#${p.jerseyNumber ?? "?"}`}
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
            </>
          )}
        </div>
      )}

      {/* 3. Beste Spieler + Spieler-Statistiken */}
      {(topHome.length > 0 || topAway.length > 0) && (
        <div className="lt-right__section">
          <div className="lt-right__section-title">⭐ Beste Spieler</div>
          <div className="lt-lineup-grid">
            <div>
              <div className="lt-lineup-team-label lt-lineup-team-label--home">
                {homeAbbr}
              </div>
              {topHome.map((p) => (
                <div key={p.id} className="lt-player lt-player--sm">
                  <span className="lt-player__rank" title="Rating">
                    {p.rating?.toFixed(1)}
                  </span>
                  <div className="lt-player__info">
                    <div className="lt-player__name">
                      {p.resolvedName ?? `#${p.jerseyNumber ?? "?"}`}
                    </div>
                    <div className="lt-player__meta">
                      {p.minutes ?? 0}'{p.goals > 0 && ` ⚽${p.goals}`}
                      {p.assists > 0 && ` 🅰️${p.assists}`}
                      {p.shotsOnTarget > 0 && ` 🎯${p.shotsOnTarget}`}
                    </div>
                  </div>
                  {p.cardsYellow > 0 && <span title="Gelb">🟨</span>}
                  {p.cardsRed > 0 && <span title="Rot">🟥</span>}
                </div>
              ))}
            </div>
            <div>
              <div className="lt-lineup-team-label lt-lineup-team-label--away">
                {awayAbbr}
              </div>
              {topAway.map((p) => (
                <div key={p.id} className="lt-player lt-player--sm">
                  <span className="lt-player__rank" title="Rating">
                    {p.rating?.toFixed(1)}
                  </span>
                  <div className="lt-player__info">
                    <div className="lt-player__name">
                      {p.resolvedName ?? `#${p.jerseyNumber ?? "?"}`}
                    </div>
                    <div className="lt-player__meta">
                      {p.minutes ?? 0}'{p.goals > 0 && ` ⚽${p.goals}`}
                      {p.assists > 0 && ` 🅰️${p.assists}`}
                      {p.shotsOnTarget > 0 && ` 🎯${p.shotsOnTarget}`}
                    </div>
                  </div>
                  {p.cardsYellow > 0 && <span title="Gelb">🟨</span>}
                  {p.cardsRed > 0 && <span title="Rot">🟥</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Spieler-Statistiken Top 3 pro Team */}
          {[
            {
              label: "⚽ Tore",
              key: "goals",
              filter: (p) => p.goals > 0,
              fmt: (p) => p.goals,
            },
            {
              label: "🅰️ Assists",
              key: "assists",
              filter: (p) => p.assists > 0,
              fmt: (p) => p.assists,
            },
            {
              label: "🎯 Schüsse aufs Tor",
              key: "shotsOnTarget",
              filter: (p) => p.shotsOnTarget > 0,
              fmt: (p) => p.shotsOnTarget,
            },
            {
              label: "🔑 Pässe",
              key: "passesTotal",
              filter: (p) => p.passesTotal > 0,
              fmt: (p) => p.passesTotal,
            },
            {
              label: "🛡️ Tackles",
              key: "tacklesTotal",
              filter: (p) => p.tacklesTotal > 0,
              fmt: (p) => p.tacklesTotal,
            },
          ].map(({ label, key, filter, fmt }) => {
            const homeTop = [...playerStats]
              .filter((s) => s.teamId === match.teamHomeId && filter(s))
              .sort((a, b) => b[key] - a[key])
              .slice(0, 3)
              .map((s) => ({ ...s, resolvedName: playerName(s.playerId) }));
            const awayTop = [...playerStats]
              .filter((s) => s.teamId === match.teamAwayId && filter(s))
              .sort((a, b) => b[key] - a[key])
              .slice(0, 3)
              .map((s) => ({ ...s, resolvedName: playerName(s.playerId) }));
            if (homeTop.length === 0 && awayTop.length === 0) return null;
            return (
              <div key={key} style={{ marginTop: "10px" }}>
                <div
                  className="lt-right__section-title"
                  style={{ fontSize: "0.75rem" }}
                >
                  {label}
                </div>
                <div className="lt-lineup-grid">
                  <div>
                    <div className="lt-lineup-team-label lt-lineup-team-label--home">
                      {homeAbbr}
                    </div>
                    {homeTop.map((p, i) => (
                      <div key={p.id} className="lt-player lt-player--sm">
                        <span className="lt-player__rank">
                          {["🥇", "🥈", "🥉"][i]}
                        </span>
                        <div className="lt-player__info">
                          <div className="lt-player__name">
                            {p.resolvedName ?? `#${p.jerseyNumber ?? "?"}`}
                          </div>
                        </div>
                        <span className="lt-player__rank">{fmt(p)}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="lt-lineup-team-label lt-lineup-team-label--away">
                      {awayAbbr}
                    </div>
                    {awayTop.map((p, i) => (
                      <div key={p.id} className="lt-player lt-player--sm">
                        <span className="lt-player__rank">
                          {["🥇", "🥈", "🥉"][i]}
                        </span>
                        <div className="lt-player__info">
                          <div className="lt-player__name">
                            {p.resolvedName ?? `#${p.jerseyNumber ?? "?"}`}
                          </div>
                        </div>
                        <span className="lt-player__rank">{fmt(p)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Torschützen */}
      {topScorers.length > 0 && (
        <div className="lt-right__section">
          <div className="lt-right__section-title">⚽ Torschützen</div>
          {topScorers.map((p) => (
            <div key={p.id} className="lt-player">
              <span className="lt-player__rank">{p.numberOfGoals}×</span>
              <div className="lt-player__info">
                <div className="lt-player__name">
                  {p.resolvedName ?? `#${p.jerseyNumber}`}
                </div>
                <div className="lt-player__meta">
                  {p.teamAbbr} · {p.position ?? "–"} · #{p.jerseyNumber}
                </div>
              </div>
              {p.hasYellowCard && <span title="Gelbe Karte">🟨</span>}
              {p.hasRedCard && <span title="Rote Karte">🟥</span>}
            </div>
          ))}
        </div>
      )}

      {/* 5. Karten */}
      {withCards.length > 0 && (
        <div className="lt-right__section">
          <div className="lt-right__section-title">🟨 Karten</div>
          {withCards.map((p) => (
            <div key={p.id} className="lt-player">
              <span className="lt-player__rank">
                {p.hasRedCard ? "🟥" : "🟨"}
              </span>
              <div className="lt-player__info">
                <div className="lt-player__name">
                  {p.resolvedName ?? `#${p.jerseyNumber}`}
                </div>
                <div className="lt-player__meta">
                  {p.teamAbbr} · #{p.jerseyNumber}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Aufstellung als Formation-Rows (4-2-3-1 Stil)
function FormationColumn({ lineup, playerName, abbr, labelClass }) {
  const formation = lineup[0]?.formation ?? "";

  const posOrder = { G: 0, D: 1, M: 2, F: 3 };
  const sorted = [...lineup].sort(
    (a, b) => (posOrder[a.position] ?? 2) - (posOrder[b.position] ?? 2),
  );

  const formationRows = formation
    ? [1, ...formation.split("-").map(Number)]
    : null;

  let rows = [];
  if (formationRows) {
    let idx = 0;
    for (const count of formationRows) {
      rows.push(sorted.slice(idx, idx + count));
      idx += count;
    }
  } else {
    const groups = {};
    for (const p of sorted) {
      const pos = p.position ?? "M";
      if (!groups[pos]) groups[pos] = [];
      groups[pos].push(p);
    }
    rows = Object.values(groups);
  }

  return (
    <div>
      <div className={`lt-lineup-team-label ${labelClass}`}>{abbr}</div>
      {formation && <div className="lt-lineup-formation">{formation}</div>}
      <div className="lt-formation-rows">
        {rows.map((row, ri) => (
          <div key={ri} className="lt-formation-row">
            {row.map((p) => {
              const name = playerName(p.playerId) ?? p.position ?? "–";
              return (
                <div key={p.id} className="lt-formation-player">
                  <div className="lt-formation-player__num">
                    #{p.jerseyNumber}
                  </div>
                  <div className="lt-formation-player__name" title={name}>
                    {name.length > 9 ? name.split(" ").pop() : name}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
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
