// ============================================================
// panels/RightPanel.jsx
// Stats, Aufstellung, Torschützen, Karten, Kader
// ============================================================
import { useState } from "react";
import { fetchGoalClips } from "../../../api";

function Collapsible({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="lt-right__section">
      <button className="lt-right__section-title lt-collapsible-hd" onClick={() => setOpen((o) => !o)}>
        {title}
        <span className="lt-collapsible-hd__arrow">{open ? "▲" : "▼"}</span>
      </button>
      <div style={{ display: open ? undefined : "none" }}>{children}</div>
    </div>
  );
}

function CollapsibleCat({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="lt-pcat">
      <button className="lt-pcat__hd-label lt-collapsible-hd" onClick={() => setOpen((o) => !o)}>
        {title}
        <span className="lt-collapsible-hd__arrow">{open ? "▲" : "▼"}</span>
      </button>
      {open && children}
    </div>
  );
}

export function RightPanel({
  match,
  matchStats,
  players,
  playerStats = [],
  lineups,
  events = [],
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

  // extToInternal: partner API external_id → internal DB id
  // Nötig weil: event description nutzt partner API IDs, lineups.playerId nutzt interne DB IDs
  const extToInternal = {};
  for (const pl of players) {
    if (pl.externalId != null) extToInternal[pl.externalId] = pl.id;
  }

  // subMinuteMap: interne DB-ID → minute (aus Events)
  // ev.liveTickerEventType = "substitution" (so in DB gespeichert)
  const subMinuteMap = {};
  for (const ev of events) {
    if (ev.liveTickerEventType !== "substitution") continue;
    try {
      const d = typeof ev.description === "string" ? JSON.parse(ev.description) : ev.description;
      const outId = extToInternal[d?.player_id];
      const inId  = extToInternal[d?.assist_id];
      if (outId && ev.time) subMinuteMap[outId] = ev.time;
      if (inId  && ev.time) subMinuteMap[`in_${inId}`] = ev.time;
    } catch { /* ignore */ }
  }

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
    .slice(0, 3)
    .map((s) => ({ ...s, resolvedName: playerName(s.playerId) }));
  const topAway = playerStats
    .filter((s) => s.teamId === match.teamAwayId && s.rating != null)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 3)
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
          {[
            ["Schüsse", homeStats.goalScoringAttempt, awayStats.goalScoringAttempt],
            ["aufs Tor", homeStats.goalOnTargetScoringAttempt, awayStats.goalOnTargetScoringAttempt],
            ["Pässe", homeStats.totalPass, awayStats.totalPass],
            ["Ecken", homeStats.cornerTaken, awayStats.cornerTaken],
            ["Fouls", homeStats.fouls, awayStats.fouls],
            ["Abseits", homeStats.totalOffside, awayStats.totalOffside],
          ].map(([lbl, h, a]) => (
            <StatRow key={lbl} label={lbl} home={h} away={a} homeVal={h} awayVal={a} />
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
                        <PlayerBadges entry={p} stat={playerStats.find((s) => s.playerId === p.playerId)} subMinuteMap={subMinuteMap} />
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
                        <PlayerBadges entry={p} stat={playerStats.find((s) => s.playerId === p.playerId)} subMinuteMap={subMinuteMap} />
                      </li>
                    ))}
                </ul>
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
              <div className="lt-pcat__col-hd lt-pcat__col-hd--home">{homeAbbr}</div>
              {topHome.map((p) => (
                <div key={p.id} className="lt-prow lt-prow--home">
                  <div className="lt-prow__body">
                    <span className="lt-prow__name">
                      {p.resolvedName ?? `#${p.jerseyNumber ?? "?"}`}
                    </span>
                    <span className="lt-prow__sub">
                      {p.minutes ?? 0}'
                      {p.goals > 0 && ` ⚽${p.goals}`}
                      {p.assists > 0 && ` 🅰️${p.assists}`}
                      {p.shotsOnTarget > 0 && ` 🎯${p.shotsOnTarget}`}
                      {p.cardsYellow > 0 && " 🟨"}
                      {p.cardsRed > 0 && " 🟥"}
                    </span>
                  </div>
                  <span className="lt-prow__rating">{p.rating?.toFixed(1)}</span>
                </div>
              ))}
            </div>
            <div>
              <div className="lt-pcat__col-hd lt-pcat__col-hd--away">{awayAbbr}</div>
              {topAway.map((p) => (
                <div key={p.id} className="lt-prow lt-prow--away">
                  <div className="lt-prow__body">
                    <span className="lt-prow__name">
                      {p.resolvedName ?? `#${p.jerseyNumber ?? "?"}`}
                    </span>
                    <span className="lt-prow__sub">
                      {p.minutes ?? 0}'
                      {p.goals > 0 && ` ⚽${p.goals}`}
                      {p.assists > 0 && ` 🅰️${p.assists}`}
                      {p.shotsOnTarget > 0 && ` 🎯${p.shotsOnTarget}`}
                      {p.cardsYellow > 0 && " 🟨"}
                      {p.cardsRed > 0 && " 🟥"}
                    </span>
                  </div>
                  <span className="lt-prow__rating">{p.rating?.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>

          {[
            { label: "⚽ Tore", key: "goals", filter: (p) => p.goals > 0, fmt: (p) => p.goals },
            { label: "🅰️ Assists", key: "assists", filter: (p) => p.assists > 0, fmt: (p) => p.assists },
            { label: "🎯 Schüsse", key: "shotsOnTarget", filter: (p) => p.shotsOnTarget > 0, fmt: (p) => p.shotsOnTarget },
            { label: "🔑 Pässe", key: "passesTotal", filter: (p) => p.passesTotal > 0, fmt: (p) => p.passesTotal },
            { label: "🛡️ Tackles", key: "tacklesTotal", filter: (p) => p.tacklesTotal > 0, fmt: (p) => p.tacklesTotal },
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
                    <div className="lt-pcat__col-hd lt-pcat__col-hd--home">{homeAbbr}</div>
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
                    <div className="lt-pcat__col-hd lt-pcat__col-hd--away">{awayAbbr}</div>
                    {awayTop.map((p) => (
                      <div key={p.id} className="lt-pcat__row lt-pcat__row--away">
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

      {/* 6. Tor-Clips */}
      <GoalClipsSection />
    </div>
  );
}

function GoalClipsSection() {
  const [clips, setClips] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchGoalClips();
      const raw = res.data;
      const list = Array.isArray(raw) ? raw : (raw?.items ?? []);
      const all = list.map((item) => item?.json ?? item);
      setClips(all);
    } catch {
      setError("Laden fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Collapsible title="🎥 Tor-Clips" defaultOpen={false}>
        {clips === null ? (
          <button className="lt-clips-btn" onClick={load} disabled={loading}>
            {loading ? "Laden…" : "Clips laden"}
          </button>
        ) : error ? (
          <div className="lt-clips-error">{error}</div>
        ) : clips.length === 0 ? (
          <div className="lt-clips-empty">Keine Clips verfügbar</div>
        ) : (
          <div className="lt-clips">
            {clips.map((c) => (
              <button
                key={c.vid}
                className="lt-clip"
                onClick={() => setSelected(c)}
              >
                <div className="lt-clip__thumb-wrap">
                  <img src={c.thumbnail} alt={c.player} className="lt-clip__thumb" />
                  <span className="lt-clip__play">▶</span>
                </div>
                <div className="lt-clip__info">
                  <span className="lt-clip__player">{c.player}</span>
                  <span className="lt-clip__score">
                    {c.isOwnGoal && <span className="lt-clip__og">ET · </span>}
                    {c.score} · Spieltag {c.matchday}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </Collapsible>

      {selected && (
        <div className="lt-clip-modal" onClick={() => setSelected(null)}>
          <div className="lt-clip-modal__box" onClick={(e) => e.stopPropagation()}>
            <button className="lt-clip-modal__close" onClick={() => setSelected(null)}>✕</button>
            <iframe
              src={`https://cdn.jwplayer.com/players/${selected.vid}.html`}
              className="lt-clip-modal__player"
              allowFullScreen
              allow="autoplay; fullscreen"
              style={{ border: "none" }}
              title={selected.player}
            />
            <div className="lt-clip-modal__info">
              <div className="lt-clip-modal__player-name">
                {selected.isOwnGoal ? "⚽ Eigentor" : "⚽"} {selected.player}
              </div>
              <div className="lt-clip-modal__meta">
                Spielstand: {selected.score} · Spieltag {selected.matchday}
              </div>
            </div>
            <a
              href={selected.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="lt-clip-modal__btn"
            >
              ↗ Auf Bundesliga.com öffnen
            </a>
          </div>
        </div>
      )}
    </>
  );
}

// Aufstellung als Formation-Rows (4-2-3-1 Stil)
function PlayerBadges({ entry, stat, subMinuteMap = {} }) {
  const goals  = stat?.goals      ?? entry.numberOfGoals ?? 0;
  const yellow = stat?.cardsYellow > 0 || entry.hasYellowCard;
  const red    = stat?.cardsRed    > 0 || entry.hasRedCard;
  const subOff = entry.isSubstituted || (entry.status === "Start" && stat?.minutes != null && stat.minutes < 85);
  const subOffMin = subMinuteMap[entry.playerId] ?? stat?.minutes ?? null;
  const subOnMin  = subMinuteMap[`in_${entry.playerId}`] ?? null;
  const subOn  = entry.status === "Sub" && (stat?.minutes > 0 || subOnMin != null);
  if (!goals && !yellow && !red && !subOff && !subOn) return null;
  return (
    <span className="lt-lineup-badges">
      {goals > 0 && Array.from({ length: goals }).map((_, i) => (
        <span key={`g${i}`} className="lt-lineup-badge">⚽</span>
      ))}
      {yellow && <span className="lt-lineup-badge">🟨</span>}
      {red    && <span className="lt-lineup-badge">🟥</span>}
      {subOff && <span className="lt-lineup-badge lt-lineup-badge--out" title="Ausgewechselt">↓{subOffMin ? `${subOffMin}'` : ""}</span>}
      {subOn  && <span className="lt-lineup-badge lt-lineup-badge--in"  title="Eingewechselt">↑{subOnMin ? `${subOnMin}'` : ""}</span>}
    </span>
  );
}

function FormationColumn({ lineup, playerName, playerStats = [], subMinuteMap = {}, abbr, labelClass }) {
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
              const stat = playerStats.find((s) => s.playerId === p.playerId);
              return (
                <div key={p.id} className="lt-formation-player">
                  <div className="lt-formation-player__num">
                    #{p.jerseyNumber}
                  </div>
                  <div className="lt-formation-player__name" title={name}>
                    {name.length > 9 ? name.split(" ").pop() : name}
                  </div>
                  {stat?.rating != null && (
                    <div className="lt-formation-player__rating">{stat.rating.toFixed(1)}</div>
                  )}
                  <PlayerBadges entry={p} stat={stat} subMinuteMap={subMinuteMap} />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatRow({ label, home, away, homeVal, awayVal, standalone }) {
  const hv = Number(homeVal ?? 0);
  const av = Number(awayVal ?? 0);
  const total = hv + av;
  const homePct = total > 0 ? (hv / total) * 100 : 50;
  const awayPct = total > 0 ? (av / total) * 100 : 50;

  if (standalone) {
    return (
      <>
        <div className="lt-stat-row">
          <span className="lt-stat-val lt-stat-val--home">{home}</span>
          <span className="lt-stat-lbl">{label}</span>
          <span className="lt-stat-val lt-stat-val--away">{away}</span>
        </div>
        {homeVal != null && awayVal != null && (
          <div className="lt-stat-bar">
            <div className="lt-stat-bar__home" style={{ width: `${homePct}%` }} />
            <div className="lt-stat-bar__away" style={{ width: `${awayPct}%` }} />
          </div>
        )}
      </>
    );
  }

  return (
    <div className="lt-stat-row">
      <span className="lt-stat-val lt-stat-val--home">{home}</span>
      <span className="lt-stat-lbl">{label}</span>
      <span className="lt-stat-val lt-stat-val--away">{away}</span>
      {homeVal != null && awayVal != null && (
        <div className="lt-stat-bar lt-stat-bar--inline">
          <div className="lt-stat-bar__home" style={{ width: `${homePct}%` }} />
          <div className="lt-stat-bar__away" style={{ width: `${awayPct}%` }} />
        </div>
      )}
    </div>
  );
}
