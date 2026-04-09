// ============================================================
// panels/RightPanel.jsx
// Stats, Aufstellung, Torschützen, Karten, Kader
// ============================================================
import { memo } from "react";
import { Collapsible } from "../components/Collapsible";
import { FormationColumn } from "../components/stats/FormationColumn";
import { StatRow } from "../components/stats/StatRow";
import { SubstitutionsSection } from "../components/stats/SubstitutionsSection";
import { InjuriesSection } from "../components/stats/InjuriesSection";
import { StatCategorySection } from "../components/stats/StatCategorySection";
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
          <div className="lt-lineup-grid lt-lineup-grid--formation">
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
              away
            />
          </div>
          {(homeCoach || awayCoach) && (
            <>
              <div className="lt-right__section-title" style={{ marginTop: 12 }}>
                🧑‍💼 Trainer
              </div>
              <div
                className="lt-lineup-grid"
                style={{ marginBottom: 2 }}
              >
                <div
                  style={{
                    fontFamily: "var(--lt-font-mono)",
                    fontSize: "0.72rem",
                    color: "var(--lt-text-muted)",
                  }}
                >
                  {homeCoach && <span>{homeCoach.playerName}</span>}
                </div>
                <div
                  style={{
                    fontFamily: "var(--lt-font-mono)",
                    fontSize: "0.72rem",
                    color: "var(--lt-text-muted)",
                    textAlign: "right",
                  }}
                >
                  {awayCoach && <span>{awayCoach.playerName}</span>}
                </div>
              </div>
            </>
          )}

          <SubstitutionsSection
            homeSubs={homeSubs}
            awaySubs={awaySubs}
            playerName={playerName}
            playerStats={playerStats}
            subMinuteMap={subMinuteMap}
            homeAbbr={homeAbbr}
            awayAbbr={awayAbbr}
          />

          <InjuriesSection injuriesBlock={injuriesBlock} />
        </Collapsible>
      )}

      {/* 5. Beste Spieler + Spieler-Statistiken */}
      {(topHome.length > 0 || topAway.length > 0) && (
        <Collapsible title="⭐ Beste Spieler">
          <div className="lt-pcat__cols">
            <div>
              <div className="lt-pcat__col-hd lt-pcat__col-hd--home">
                {homeAbbr}
              </div>
              {topHome.map((p) => (
                <div key={p.id} className="lt-pcat__row">
                  <span className="lt-pcat__val">{p.rating?.toFixed(1) ?? "–"}</span>
                  <div style={{ minWidth: 0 }}>
                    <span className="lt-pcat__name">
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
                </div>
              ))}
            </div>
            <div>
              <div className="lt-pcat__col-hd lt-pcat__col-hd--away">
                {awayAbbr}
              </div>
              {topAway.map((p) => (
                <div key={p.id} className="lt-pcat__row lt-pcat__row--away">
                  <span className="lt-pcat__val">{p.rating?.toFixed(1) ?? "–"}</span>
                  <div style={{ minWidth: 0 }}>
                    <span className="lt-pcat__name">
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
          ].map(({ label, key, filter, fmt }) => (
            <StatCategorySection
              key={key}
              label={label}
              statKey={key}
              filter={filter}
              fmt={fmt}
              playerStats={playerStats}
              match={match}
              homeAbbr={homeAbbr}
              awayAbbr={awayAbbr}
              playerName={playerName}
            />
          ))}
        </Collapsible>
      )}

      {/* 6. Torschützen */}
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

      {/* 7. Karten */}
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
