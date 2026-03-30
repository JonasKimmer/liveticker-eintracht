import { memo } from "react";
import { PlayerBadges } from "./PlayerBadges";
import type { LineupEntry, PlayerStat } from "../../../types";

interface FormationColumnProps {
  lineup: LineupEntry[];
  playerName: (id: number) => string | undefined;
  playerStats?: PlayerStat[];
  subMinuteMap?: Record<string | number, number>;
  abbr: string;
  labelClass: string;
}

export const FormationColumn = memo(function FormationColumn({ lineup, playerName, playerStats = [], subMinuteMap = {}, abbr, labelClass }: FormationColumnProps) {
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

