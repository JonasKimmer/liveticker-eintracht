import { memo } from "react";
import { CollapsibleCat } from "../Collapsible";
import type { InjuryPlayer } from "../../../../types";

interface InjuriesBlock {
  homePlayers: InjuryPlayer[];
  awayPlayers: InjuryPlayer[];
  homeName: string;
  awayName: string;
}

interface InjuriesSectionProps {
  injuriesBlock: InjuriesBlock | null;
}

export const InjuriesSection = memo(function InjuriesSection({
  injuriesBlock,
}: InjuriesSectionProps) {
  if (!injuriesBlock) return null;

  const renderPlayer = (p: InjuryPlayer, i: number) => (
    <div key={i} className="lt-pcat__row">
      <div style={{ minWidth: 0 }}>
        <span className="lt-pcat__name">{p.player_name ?? p.name}</span>
        {p.reason && (
          <span className="lt-prow__sub">· {p.reason}</span>
        )}
      </div>
    </div>
  );

  return (
    <CollapsibleCat title="🤕 Verletzt / Fraglich">
      <div className="lt-pcat__cols">
        <div>
          <div className="lt-pcat__col-hd lt-pcat__col-hd--home">
            {injuriesBlock.homeName}
          </div>
          {injuriesBlock.homePlayers.length === 0
            ? <div className="lt-pcat__row"><span className="lt-pcat__name" style={{ opacity: 0.4 }}>–</span></div>
            : injuriesBlock.homePlayers.map(renderPlayer)}
        </div>
        <div>
          <div className="lt-pcat__col-hd lt-pcat__col-hd--away">
            {injuriesBlock.awayName}
          </div>
          {injuriesBlock.awayPlayers.length === 0
            ? <div className="lt-pcat__row"><span className="lt-pcat__name" style={{ opacity: 0.4 }}>–</span></div>
            : injuriesBlock.awayPlayers.map(renderPlayer)}
        </div>
      </div>
    </CollapsibleCat>
  );
});
