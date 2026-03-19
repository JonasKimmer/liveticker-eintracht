// ============================================================
// Breadcrumb.jsx
// Zeigt: Liga › Saison › Spieltag › Heim vs Gast
// Klick → onOpen() öffnet MatchSelectorModal
// ============================================================
import { memo } from "react";

export const Breadcrumb = memo(function Breadcrumb({ match, competition, country, team, round, onOpen }) {
  if (!match || !competition) return null;

  const roundLabel = round
    ? `Spieltag ${String(round).match(/\d+/)?.[0] ?? round}`
    : null;

  const segments = [
    country,
    team?.name,
    competition.title,
    roundLabel,
  ].filter(Boolean);

  return (
    <button className="lt-breadcrumb" onClick={onOpen} title="Match wechseln">
      {segments.map((seg, i) => (
        <React.Fragment key={i}>
          <span className="lt-breadcrumb__seg">{seg}</span>
          <span className="lt-breadcrumb__sep">›</span>
        </React.Fragment>
      ))}
      <span className="lt-breadcrumb__seg lt-breadcrumb__seg--match">
        {match.homeTeam?.name} vs {match.awayTeam?.name}
      </span>
      <span className="lt-breadcrumb__edit">✎</span>
    </button>
  );
});
