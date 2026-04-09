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

  const sorted = (list: LineupEntry[]) =>
    [...list].sort((a, b) => (a.jerseyNumber ?? 99) - (b.jerseyNumber ?? 99));

  const renderPlayer = (p: LineupEntry) => (
    <div key={p.id} className="lt-pcat__row">
      <span className="lt-pcat__val">
        {p.jerseyNumber != null ? `#${p.jerseyNumber}` : "–"}
      </span>
      <span className="lt-pcat__name" style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
        {playerName(p.playerId) ?? `#${p.jerseyNumber ?? "?"}`}
        <PlayerBadges
          entry={p}
          stat={playerStats.find((s) => s.playerId === p.playerId)}
          subMinuteMap={subMinuteMap}
        />
      </span>
    </div>
  );

  return (
    <CollapsibleCat title="🔄 Auswechselbank">
      <div className="lt-pcat__cols">
        <div>
          <div className="lt-pcat__col-hd lt-pcat__col-hd--home">{homeAbbr}</div>
          {sorted(homeSubs).map(renderPlayer)}
        </div>
        <div>
          <div className="lt-pcat__col-hd lt-pcat__col-hd--away">{awayAbbr}</div>
          {sorted(awaySubs).map(renderPlayer)}
        </div>
      </div>
    </CollapsibleCat>
  );
});
