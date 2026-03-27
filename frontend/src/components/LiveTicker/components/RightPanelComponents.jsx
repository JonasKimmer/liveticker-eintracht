// ============================================================
// RightPanelComponents.jsx
// Wiederverwendbare Unter-Komponenten für RightPanel
// ============================================================
import { memo, useState } from "react";
import PropTypes from "prop-types";

// Gemeinsame Toggle-Logik für Collapsible + CollapsibleCat.
// mountContent=true → konditionales Rendern; false → display:none (behält DOM-Zustand).
function CollapsibleBase({ title, defaultOpen, wrapperClass, titleClass, mountContent, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={wrapperClass}>
      <button className={titleClass} onClick={() => setOpen((o) => !o)}>
        {title}
        <span className="lt-collapsible-hd__arrow">{open ? "▲" : "▼"}</span>
      </button>
      {mountContent
        ? (open ? children : null)
        : <div style={{ display: open ? undefined : "none" }}>{children}</div>
      }
    </div>
  );
}

CollapsibleBase.propTypes = {
  title: PropTypes.string.isRequired,
  defaultOpen: PropTypes.bool,
  wrapperClass: PropTypes.string.isRequired,
  titleClass: PropTypes.string.isRequired,
  mountContent: PropTypes.bool,
  children: PropTypes.node,
};

export const Collapsible = memo(function Collapsible({ title, defaultOpen = true, children }) {
  return (
    <CollapsibleBase
      title={title}
      defaultOpen={defaultOpen}
      wrapperClass="lt-right__section"
      titleClass="lt-right__section-title lt-collapsible-hd"
      mountContent={false}
    >
      {children}
    </CollapsibleBase>
  );
});

Collapsible.propTypes = {
  title: PropTypes.string.isRequired,
  defaultOpen: PropTypes.bool,
  children: PropTypes.node,
};

export const CollapsibleCat = memo(function CollapsibleCat({ title, defaultOpen = true, children }) {
  return (
    <CollapsibleBase
      title={title}
      defaultOpen={defaultOpen}
      wrapperClass="lt-pcat"
      titleClass="lt-pcat__hd-label lt-collapsible-hd"
      mountContent={true}
    >
      {children}
    </CollapsibleBase>
  );
});

CollapsibleCat.propTypes = {
  title: PropTypes.string.isRequired,
  defaultOpen: PropTypes.bool,
  children: PropTypes.node,
};

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

PlayerBadges.propTypes = {
  entry: PropTypes.shape({
    playerId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    numberOfGoals: PropTypes.number,
    hasYellowCard: PropTypes.bool,
    hasRedCard: PropTypes.bool,
    isSubstituted: PropTypes.bool,
    status: PropTypes.string,
  }).isRequired,
  stat: PropTypes.shape({
    goals: PropTypes.number,
    cardsYellow: PropTypes.number,
    cardsRed: PropTypes.number,
    minutes: PropTypes.number,
    rating: PropTypes.number,
  }),
  subMinuteMap: PropTypes.object,
};

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

FormationColumn.propTypes = {
  lineup: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    playerId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    position: PropTypes.string,
    jerseyNumber: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    formation: PropTypes.string,
  })).isRequired,
  playerName: PropTypes.func.isRequired,
  playerStats: PropTypes.array,
  subMinuteMap: PropTypes.object,
  abbr: PropTypes.string,
  labelClass: PropTypes.string,
};

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

StatRow.propTypes = {
  label: PropTypes.string.isRequired,
  home: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  away: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  homeVal: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  awayVal: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  standalone: PropTypes.bool,
};
