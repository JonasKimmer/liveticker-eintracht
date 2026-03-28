// ============================================================
// Breadcrumb.jsx
// Zeigt: Liga › Saison › Spieltag › Heim vs Gast
// Klick → onOpen() öffnet MatchSelectorModal
// ============================================================
import { memo, Fragment, useMemo } from "react";
import { makeRoundLabel } from "utils/roundLabel";

import type { Match, Competition, Team } from "../../../types";

interface BreadcrumbProps {
  match: Match | null;
  competition: Competition | null;
  country?: string | null;
  team?: Team | null;
  round?: number | null;
  matchdays?: number[];
  onOpen: () => void;
}

export const Breadcrumb: any = memo(function Breadcrumb({ match, competition, country, team, round, matchdays, onOpen }: BreadcrumbProps) {
  const { full } = useMemo(() => makeRoundLabel(matchdays ?? []), [matchdays]);

  if (!match || !competition) return null;

  const roundLabel = round ? full(round) : null;

  const segments = [
    { value: country,            cls: "country" },
    { value: team?.name,         cls: "team" },
    { value: competition.title,  cls: "competition" },
    { value: roundLabel,         cls: "round" },
  ].filter(({ value }) => value);

  return (
    <button className="lt-breadcrumb" onClick={onOpen} title="Match wechseln">
      {segments.map(({ value, cls }) => (
        <Fragment key={cls}>
          <span className={`lt-breadcrumb__seg lt-breadcrumb__seg--${cls}`}>{value}</span>
          <span className="lt-breadcrumb__sep">›</span>
        </Fragment>
      ))}
      <span className="lt-breadcrumb__seg lt-breadcrumb__seg--match">
        {match.homeTeam?.name} vs {match.awayTeam?.name}
      </span>
      <span className="lt-breadcrumb__edit">✎</span>
    </button>
  );
});

