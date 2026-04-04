import { memo } from "react";
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

  return (
    <>
      <div className="lt-right__section-title" style={{ marginTop: "12px" }}>
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
  );
});
