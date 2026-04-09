import { memo } from "react";
import { CollapsibleCat } from "../Collapsible";
import type { LineupEntry, PlayerStat } from "../../../../types";
import { PlayerBadges } from "./PlayerBadges";

interface SubstitutionsSectionProps {
  homeSubs: LineupEntry[];
  awaySubs: LineupEntry[];
  playerName: (id: number | undefined | null) => string | null;
  playerStats: PlayerStat[];
  subMinuteMap: Record<string | number, number>;
  homeAbbr: string;
  awayAbbr: string;
}

export const SubstitutionsSection = memo(function SubstitutionsSection({
  homeSubs,
  awaySubs,
  playerName,
  playerStats,
  subMinuteMap,
  homeAbbr,
  awayAbbr,
}: SubstitutionsSectionProps) {
  if (homeSubs.length === 0 && awaySubs.length === 0) return null;

  return (
    <CollapsibleCat title="🔄 Auswechselbank">
      <div className="lt-lineup-grid">
        <div>
          <div className="lt-pcat__col-hd lt-pcat__col-hd--home">{homeAbbr}</div>
          <ul className="lt-lineup-list">
            {homeSubs
              .sort((a, b) => (a.jerseyNumber ?? 99) - (b.jerseyNumber ?? 99))
              .map((p) => (
                <li key={p.id}>
                  {p.jerseyNumber != null && (
                    <span className="lt-lineup-num">#{p.jerseyNumber}</span>
                  )}
                  <span>
                    {playerName(p.playerId) ?? `#${p.jerseyNumber ?? "?"}`}
                  </span>
                  <PlayerBadges
                    entry={p}
                    stat={playerStats.find((s) => s.playerId === p.playerId)}
                    subMinuteMap={subMinuteMap}
                  />
                </li>
              ))}
          </ul>
        </div>
        <div>
          <div className="lt-pcat__col-hd lt-pcat__col-hd--away">{awayAbbr}</div>
          <ul className="lt-lineup-list">
            {awaySubs
              .sort((a, b) => (a.jerseyNumber ?? 99) - (b.jerseyNumber ?? 99))
              .map((p) => (
                <li key={p.id}>
                  {p.jerseyNumber != null && (
                    <span className="lt-lineup-num">#{p.jerseyNumber}</span>
                  )}
                  <span>
                    {playerName(p.playerId) ?? `#${p.jerseyNumber ?? "?"}`}
                  </span>
                  <PlayerBadges
                    entry={p}
                    stat={playerStats.find((s) => s.playerId === p.playerId)}
                    subMinuteMap={subMinuteMap}
                  />
                </li>
              ))}
          </ul>
        </div>
      </div>
    </CollapsibleCat>
  );
});
