// ============================================================
// panels/RightPanel.jsx
// Stats, Aufstellung, Torschützen, Karten, Kader
// ============================================================

export function RightPanel({ match, matchStats, players, playerStats = [], lineups }) {
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

  // Spielername per playerId
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

  // Beste 5 pro Team aus player_statistics
  const topHome = playerStats
    .filter((s) => s.teamId === match.teamHomeId && s.rating != null)
    .slice(0, 5)
    .map((s) => ({ ...s, resolvedName: playerName(s.playerId) }));
  const topAway = playerStats
    .filter((s) => s.teamId === match.teamAwayId && s.rating != null)
    .slice(0, 5)
    .map((s) => ({ ...s, resolvedName: playerName(s.playerId) }));

  // Torschützen aus Lineup
  const topScorers = [...lineups]
    .filter((l) => l.numberOfGoals > 0)
    .sort((a, b) => b.numberOfGoals - a.numberOfGoals)
    .slice(0, 5)
    .map((l) => ({
      ...l,
      resolvedName: playerName(l.playerId),
      teamAbbr: l.teamId === match.teamHomeId ? homeAbbr : awayAbbr,
    }));

  // Karten
  const withCards = lineups
    .filter((l) => l.hasYellowCard || l.hasRedCard)
    .map((l) => ({
      ...l,
      resolvedName: playerName(l.playerId),
      teamAbbr: l.teamId === match.teamHomeId ? homeAbbr : awayAbbr,
    }));

  // Kader-Spieler
  const homeSquad = players
    .filter((p) => p.teamId === match.teamHomeId)
    .sort((a, b) => (a.jerseyNumber ?? 99) - (b.jerseyNumber ?? 99));
  const awaySquad = players
    .filter((p) => p.teamId === match.teamAwayId)
    .sort((a, b) => (a.jerseyNumber ?? 99) - (b.jerseyNumber ?? 99));

  const displayName = (p) =>
    p.knownName || p.displayName || `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || `#${p.jerseyNumber}`;

  return (
    <div className="lt-col lt-col--stats">
      {/* Statistiken */}
      {homeStats && awayStats && (
        <div className="lt-right__section">
          <div className="lt-right__section-title">📊 Statistiken</div>
          <StatRow
            label="Ballbesitz"
            home={`${homeStats.possessionPercentage}%`}
            away={`${awayStats.possessionPercentage}%`}
          />
          <div className="lt-stat-bar">
            <div className="lt-stat-bar__home" style={{ width: `${homeStats.possessionPercentage}%` }} />
            <div className="lt-stat-bar__away" style={{ width: `${awayStats.possessionPercentage}%` }} />
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

      {/* Beste Spieler – je 5 pro Team */}
      {(topHome.length > 0 || topAway.length > 0) && (
        <div className="lt-right__section">
          <div className="lt-right__section-title">⭐ Beste Spieler</div>
          <div className="lt-lineup-grid">
            {/* Heimteam */}
            <div>
              <div className="lt-lineup-team-label lt-lineup-team-label--home">{homeAbbr}</div>
              {topHome.map((p) => (
                <div key={p.id} className="lt-player lt-player--sm">
                  <span className="lt-player__rank" title="Rating">{p.rating?.toFixed(1)}</span>
                  <div className="lt-player__info">
                    <div className="lt-player__name">{p.resolvedName ?? `#${p.jerseyNumber ?? "?"}`}</div>
                    <div className="lt-player__meta">
                      {p.minutes ?? 0}'
                      {p.goals > 0 && ` ⚽${p.goals}`}
                      {p.assists > 0 && ` 🅰️${p.assists}`}
                      {p.shotsOnTarget > 0 && ` 🎯${p.shotsOnTarget}`}
                    </div>
                  </div>
                  {p.cardsYellow > 0 && <span title="Gelb">🟨</span>}
                  {p.cardsRed > 0 && <span title="Rot">🟥</span>}
                </div>
              ))}
            </div>
            {/* Auswärtsteam */}
            <div>
              <div className="lt-lineup-team-label lt-lineup-team-label--away">{awayAbbr}</div>
              {topAway.map((p) => (
                <div key={p.id} className="lt-player lt-player--sm">
                  <span className="lt-player__rank" title="Rating">{p.rating?.toFixed(1)}</span>
                  <div className="lt-player__info">
                    <div className="lt-player__name">{p.resolvedName ?? `#${p.jerseyNumber ?? "?"}`}</div>
                    <div className="lt-player__meta">
                      {p.minutes ?? 0}'
                      {p.goals > 0 && ` ⚽${p.goals}`}
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
        </div>
      )}

      {/* Torschützen */}
      {topScorers.length > 0 && (
        <div className="lt-right__section">
          <div className="lt-right__section-title">⚽ Torschützen</div>
          {topScorers.map((p) => (
            <div key={p.id} className="lt-player">
              <span className="lt-player__rank">{p.numberOfGoals}×</span>
              <div className="lt-player__info">
                <div className="lt-player__name">{p.resolvedName ?? `#${p.jerseyNumber}`}</div>
                <div className="lt-player__meta">{p.teamAbbr} · {p.position ?? "–"} · #{p.jerseyNumber}</div>
              </div>
              {p.hasYellowCard && <span title="Gelbe Karte">🟨</span>}
              {p.hasRedCard && <span title="Rote Karte">🟥</span>}
            </div>
          ))}
        </div>
      )}

      {/* Karten */}
      {withCards.length > 0 && (
        <div className="lt-right__section">
          <div className="lt-right__section-title">🟨 Karten</div>
          {withCards.map((p) => (
            <div key={p.id} className="lt-player">
              <span className="lt-player__rank">{p.hasRedCard ? "🟥" : "🟨"}</span>
              <div className="lt-player__info">
                <div className="lt-player__name">{p.resolvedName ?? `#${p.jerseyNumber}`}</div>
                <div className="lt-player__meta">{p.teamAbbr} · #{p.jerseyNumber}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Aufstellungen */}
      {(homeLineup.length > 0 || awayLineup.length > 0) && (
        <div className="lt-right__section">
          <div className="lt-right__section-title">📋 Aufstellung</div>
          <div className="lt-lineup-grid">
            <div>
              <div className="lt-lineup-team-label lt-lineup-team-label--home">{homeAbbr}</div>
              {homeLineup[0]?.formation && (
                <div className="lt-lineup-formation">{homeLineup[0].formation}</div>
              )}
              <ul className="lt-lineup-list">
                {[...homeLineup]
                  .sort((a, b) => (a.jerseyNumber ?? 99) - (b.jerseyNumber ?? 99))
                  .map((p) => (
                    <li key={p.id}>
                      {p.jerseyNumber != null && <span className="lt-lineup-num">#{p.jerseyNumber}</span>}
                      <span>{playerName(p.playerId) ?? (p.jerseyNumber != null ? `#${p.jerseyNumber}` : "–")}</span>
                    </li>
                  ))}
              </ul>
            </div>
            <div>
              <div className="lt-lineup-team-label lt-lineup-team-label--away">{awayAbbr}</div>
              {awayLineup[0]?.formation && (
                <div className="lt-lineup-formation">{awayLineup[0].formation}</div>
              )}
              <ul className="lt-lineup-list">
                {[...awayLineup]
                  .sort((a, b) => (a.jerseyNumber ?? 99) - (b.jerseyNumber ?? 99))
                  .map((p) => (
                    <li key={p.id}>
                      {p.jerseyNumber != null && <span className="lt-lineup-num">#{p.jerseyNumber}</span>}
                      <span>{playerName(p.playerId) ?? (p.jerseyNumber != null ? `#${p.jerseyNumber}` : "–")}</span>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Kader */}
      {(homeSquad.length > 0 || awaySquad.length > 0) && (
        <div className="lt-right__section">
          <div className="lt-right__section-title">👤 Kader</div>
          <div className="lt-lineup-grid">
            <div>
              <div className="lt-lineup-team-label lt-lineup-team-label--home">{homeAbbr}</div>
              <ul className="lt-lineup-list">
                {homeSquad.map((p) => (
                  <li key={p.id}>
                    {p.jerseyNumber != null && <span className="lt-lineup-num">#{p.jerseyNumber}</span>}
                    <span>{displayName(p)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="lt-lineup-team-label lt-lineup-team-label--away">{awayAbbr}</div>
              <ul className="lt-lineup-list">
                {awaySquad.map((p) => (
                  <li key={p.id}>
                    {p.jerseyNumber != null && <span className="lt-lineup-num">#{p.jerseyNumber}</span>}
                    <span>{displayName(p)}</span>
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

// Aufstellung als Formation-Rows (4-2-3-1 Stil)
function FormationColumn({ lineup, players, playerName, abbr, labelClass }) {
  const formation = lineup[0]?.formation ?? "";

  // Positions-Reihenfolge: G → D → M → F
  const posOrder = { G: 0, D: 1, M: 2, F: 3 };
  const sorted = [...lineup].sort(
    (a, b) => (posOrder[a.position] ?? 2) - (posOrder[b.position] ?? 2),
  );

  // Formation parsen: "4-2-3-1" → [1, 4, 2, 3, 1] (GK immer vorne)
  const formationRows = formation
    ? [1, ...formation.split("-").map(Number)]
    : null;

  // Spieler in Reihen aufteilen
  let rows = [];
  if (formationRows) {
    let idx = 0;
    for (const count of formationRows) {
      rows.push(sorted.slice(idx, idx + count));
      idx += count;
    }
  } else {
    // Fallback: nach Position gruppieren
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
      {formation && (
        <div className="lt-lineup-formation">{formation}</div>
      )}
      <div className="lt-formation-rows">
        {rows.map((row, ri) => (
          <div key={ri} className="lt-formation-row">
            {row.map((p) => {
              const name = playerName(p.playerId) ?? p.position ?? "–";
              return (
                <div key={p.id} className="lt-formation-player">
                  <div className="lt-formation-player__num">#{p.jerseyNumber}</div>
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
