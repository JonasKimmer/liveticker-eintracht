// ============================================================
// Breadcrumb.jsx
// Zeigt: Liga › Saison › Spieltag › Heim vs Gast
// Klick → onOpen() öffnet MatchSelectorModal
// ============================================================
import { memo, Fragment, useMemo } from "react";
import { makeRoundLabel } from "utils/roundLabel";

export const Breadcrumb: any = memo<any>(function Breadcrumb({ match, competition, country, team, round, matchdays, onOpen }: any) {
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

