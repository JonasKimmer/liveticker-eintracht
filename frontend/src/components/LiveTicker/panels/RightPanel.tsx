// ============================================================
// panels/RightPanel.jsx
// Stats, Aufstellung, Torschützen, Karten, Kader
// ============================================================
import { memo } from "react";
import { Collapsible, CollapsibleCat } from "../components/Collapsible";
import { PlayerBadges } from "../components/stats/PlayerBadges";
import { FormationColumn } from "../components/stats/FormationColumn";
import { StatRow } from "../components/stats/StatRow";
import { useRightPanelData } from "../hooks/useRightPanelData";
import { useTickerDataContext } from "../../../context/TickerDataContext";

export const RightPanel = memo(function RightPanel() {
  const {
    match,
    matchStats,
    players,
    playerStats = [],
    lineups,
    events = [],
    injuries = [],
  } = useTickerDataContext();
  const {
    homeAbbr,
    awayAbbr,
    homeStats,
    awayStats,
    homeLineup,
    awayLineup,
    homeStarters,
    homeSubs,
    homeCoach,
    awayStarters,
    awaySubs,
    awayCoach,
    topHome,
    topAway,
    topScorers,
    withCards,
    injuriesBlock,
    playerName,
    subMinuteMap,
  } = useRightPanelData({
    match,
    matchStats,
    players,
    playerStats,
    lineups,
    events,
    injuries,
  });

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

  return (
    <div className="lt-col lt-col--stats">
      {/* 1. Statistiken */}
      {homeStats && awayStats && (
        <Collapsible title="📊 Statistiken">
          <div className="lt-stat-teams">
            <span className="lt-stat-teams__home">{homeAbbr}</span>
            <span />
            <span className="lt-stat-teams__away">{awayAbbr}</span>
          </div>
          <StatRow
            label="Ballbesitz"
            home={`${homeStats.possessionPercentage}%`}
            away={`${awayStats.possessionPercentage}%`}
            homeVal={homeStats.possessionPercentage}
            awayVal={awayStats.possessionPercentage}
            standalone
          />
          {(
            [
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
            ] as [
              string,
              number | null | undefined,
              number | null | undefined,
            ][]
          ).map(([lbl, h, a]) => (
            <StatRow
              key={lbl}
              label={lbl}
              home={h ?? 0}
              away={a ?? 0}
              homeVal={h}
              awayVal={a}
            />
          ))}
        </Collapsible>
      )}

      {/* 2. Aufstellung */}
      {(homeLineup.length > 0 || awayLineup.length > 0) && (
        <Collapsible title="📋 Aufstellung">
          <div className="lt-lineup-grid">
            <FormationColumn
              lineup={homeStarters}
              playerName={playerName}
              playerStats={playerStats}
              subMinuteMap={subMinuteMap}
              abbr={homeAbbr}
              labelClass="lt-lineup-team-label--home"
            />
            <FormationColumn
              lineup={awayStarters}
              playerName={playerName}
              playerStats={playerStats}
              subMinuteMap={subMinuteMap}
              abbr={awayAbbr}
              labelClass="lt-lineup-team-label--away"
            />
          </div>
          {(homeCoach || awayCoach) && (
            <div
              className="lt-lineup-grid"
              style={{ marginTop: 10, marginBottom: 2 }}
            >
              <div
                style={{
                  fontFamily: "var(--lt-font-mono)",
                  fontSize: "0.72rem",
                  color: "var(--lt-text-muted)",
                }}
              >
                {homeCoach && <span>🧑‍💼 {homeCoach.playerName}</span>}
              </div>
              <div
                style={{
                  fontFamily: "var(--lt-font-mono)",
                  fontSize: "0.72rem",
                  color: "var(--lt-text-muted)",
                  textAlign: "right",
                }}
              >
                {awayCoach && <span>{awayCoach.playerName} 🧑‍💼</span>}
              </div>
            </div>
          )}

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
                        <PlayerBadges
                          entry={p}
                          stat={playerStats.find(
                            (s) => s.playerId === p.playerId,
                          )}
                          subMinuteMap={subMinuteMap}
                        />
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
                        <PlayerBadges
                          entry={p}
                          stat={playerStats.find(
                            (s) => s.playerId === p.playerId,
                          )}
                          subMinuteMap={subMinuteMap}
                        />
                      </li>
                    ))}
                </ul>
              </div>
            </>
          )}

          {injuriesBlock && (
            <>
              <div
                className="lt-right__section-title"
                style={{ marginTop: "12px" }}
              >
                🤕 Verletzt / Fraglich
              </div>
              <div className="lt-lineup-grid">
                <div>
                  <div className="lt-pcat__col-hd lt-pcat__col-hd--home">
                    {injuriesBlock.homeName}
                  </div>
                  <ul className="lt-lineup-list">
                    {injuriesBlock.homePlayers.map((p, i) => (
                      <li
                        key={i}
                        style={{
                          color: "var(--lt-text-muted)",
                          fontSize: "0.78rem",
                        }}
                      >
                        <span>{p.player_name ?? p.name}</span>
                        {p.reason && (
                          <span style={{ marginLeft: 4, opacity: 0.7 }}>
                            · {p.reason}
                          </span>
                        )}
                      </li>
                    ))}
                    {injuriesBlock.homePlayers.length === 0 && (
                      <li
                        style={{
                          color: "var(--lt-text-muted)",
                          fontSize: "0.78rem",
                          opacity: 0.5,
                        }}
                      >
                        –
                      </li>
                    )}
                  </ul>
                </div>
                <div>
                  <div className="lt-pcat__col-hd lt-pcat__col-hd--away">
                    {injuriesBlock.awayName}
                  </div>
                  <ul className="lt-lineup-list">
                    {injuriesBlock.awayPlayers.map((p, i) => (
                      <li
                        key={i}
                        style={{
                          color: "var(--lt-text-muted)",
                          fontSize: "0.78rem",
                        }}
                      >
                        <span>{p.player_name ?? p.name}</span>
                        {p.reason && (
                          <span style={{ marginLeft: 4, opacity: 0.7 }}>
                            · {p.reason}
                          </span>
                        )}
                      </li>
                    ))}
                    {injuriesBlock.awayPlayers.length === 0 && (
                      <li
                        style={{
                          color: "var(--lt-text-muted)",
                          fontSize: "0.78rem",
                          opacity: 0.5,
                        }}
                      >
                        –
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </>
          )}
        </Collapsible>
      )}

      {/* 3. Beste Spieler + Spieler-Statistiken */}
      {(topHome.length > 0 || topAway.length > 0) && (
        <Collapsible title="⭐ Beste Spieler">
          <div className="lt-pcat__cols">
            <div>
              <div className="lt-pcat__col-hd lt-pcat__col-hd--home">
                {homeAbbr}
              </div>
              {topHome.map((p) => (
                <div key={p.id} className="lt-prow lt-prow--home">
                  <div className="lt-prow__body">
                    <span className="lt-prow__name">
                      {p.resolvedName ?? `#${p.jerseyNumber ?? "?"}`}
                    </span>
                    <span className="lt-prow__sub">
                      {p.minutes ?? 0}'{p.goals > 0 && ` ⚽${p.goals}`}
                      {p.assists > 0 && ` 🅰️${p.assists}`}
                      {p.shotsOnTarget > 0 && ` 🎯${p.shotsOnTarget}`}
                      {p.cardsYellow > 0 && " 🟨"}
                      {p.cardsRed > 0 && " 🟥"}
                    </span>
                  </div>
                  <span className="lt-prow__rating">
                    {p.rating?.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
            <div>
              <div className="lt-pcat__col-hd lt-pcat__col-hd--away">
                {awayAbbr}
              </div>
              {topAway.map((p) => (
                <div key={p.id} className="lt-prow lt-prow--away">
                  <div className="lt-prow__body">
                    <span className="lt-prow__name">
                      {p.resolvedName ?? `#${p.jerseyNumber ?? "?"}`}
                    </span>
                    <span className="lt-prow__sub">
                      {p.minutes ?? 0}'{p.goals > 0 && ` ⚽${p.goals}`}
                      {p.assists > 0 && ` 🅰️${p.assists}`}
                      {p.shotsOnTarget > 0 && ` 🎯${p.shotsOnTarget}`}
                      {p.cardsYellow > 0 && " 🟨"}
                      {p.cardsRed > 0 && " 🟥"}
                    </span>
                  </div>
                  <span className="lt-prow__rating">
                    {p.rating?.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>

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
              label: "🎯 Schüsse",
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
              <CollapsibleCat key={key} title={label}>
                <div className="lt-pcat__cols">
                  <div>
                    <div className="lt-pcat__col-hd lt-pcat__col-hd--home">
                      {homeAbbr}
                    </div>
                    {homeTop.map((p) => (
                      <div key={p.id} className="lt-pcat__row">
                        <span className="lt-pcat__val">{fmt(p)}</span>
                        <span className="lt-pcat__name">
                          {p.resolvedName ?? `#${p.jerseyNumber ?? "?"}`}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="lt-pcat__col-hd lt-pcat__col-hd--away">
                      {awayAbbr}
                    </div>
                    {awayTop.map((p) => (
                      <div
                        key={p.id}
                        className="lt-pcat__row lt-pcat__row--away"
                      >
                        <span className="lt-pcat__name">
                          {p.resolvedName ?? `#${p.jerseyNumber ?? "?"}`}
                        </span>
                        <span className="lt-pcat__val">{fmt(p)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CollapsibleCat>
            );
          })}
        </Collapsible>
      )}

      {/* 4. Torschützen */}
      {topScorers.length > 0 && (
        <Collapsible title="⚽ Torschützen">
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
        </Collapsible>
      )}

      {/* 5. Karten */}
      {withCards.length > 0 && (
        <Collapsible title="🟨 Karten">
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
        </Collapsible>
      )}
    </div>
  );
});
