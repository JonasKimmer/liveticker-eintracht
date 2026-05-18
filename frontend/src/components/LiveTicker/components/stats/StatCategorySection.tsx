import { memo } from "react";
import { CollapsibleCat } from "../Collapsible";
import type { Match, PlayerStat } from "../../../../types";

interface StatCategorySectionProps {
  label: string;
  statKey: string;
  filter: (p: PlayerStat) => boolean;
  fmt: (p: PlayerStat) => number;
  playerStats: PlayerStat[];
  match: Match;
  homeAbbr: string;
  awayAbbr: string;
  playerName: (id: number | undefined | null) => string | null;
}

export const StatCategorySection = memo(function StatCategorySection({
  label,
  statKey,
  filter,
  fmt,
  playerStats,
  match,
  homeAbbr,
  awayAbbr,
  playerName,
}: StatCategorySectionProps) {
  const homeTop = [...playerStats]
    .filter((s) => s.teamId === match.teamHomeId && filter(s))
    .sort((a, b) => b[statKey] - a[statKey])
    .slice(0, 3)
    .map((s) => ({ ...s, resolvedName: playerName(s.playerId) }));
  const awayTop = [...playerStats]
    .filter((s) => s.teamId === match.teamAwayId && filter(s))
    .sort((a, b) => b[statKey] - a[statKey])
    .slice(0, 3)
    .map((s) => ({ ...s, resolvedName: playerName(s.playerId) }));
  if (homeTop.length === 0 && awayTop.length === 0) return null;
  return (
    <CollapsibleCat title={label}>
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
            <div key={p.id} className="lt-pcat__row lt-pcat__row--away">
              <span className="lt-pcat__val">{fmt(p)}</span>
              <span className="lt-pcat__name">
                {p.resolvedName ?? `#${p.jerseyNumber ?? "?"}`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </CollapsibleCat>
  );
});
