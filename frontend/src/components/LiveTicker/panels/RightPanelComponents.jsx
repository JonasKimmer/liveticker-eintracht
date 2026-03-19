// ============================================================
// RightPanelComponents.jsx
// Wiederverwendbare Unter-Komponenten für RightPanel
// ============================================================
import { memo, useState } from "react";

export const Collapsible = memo(function Collapsible({ title, defaultOpen = true, children }) {
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
});

export const CollapsibleCat = memo(function CollapsibleCat({ title, defaultOpen = true, children }) {
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
});

export const PlayerBadges = memo(function PlayerBadges({ entry, stat, subMinuteMap = {} }) {
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
});

export const FormationColumn = memo(function FormationColumn({ lineup, playerName, playerStats = [], subMinuteMap = {}, abbr, labelClass }) {
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
});

export const StatRow = memo(function StatRow({ label, home, away, homeVal, awayVal, standalone }) {
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
});
