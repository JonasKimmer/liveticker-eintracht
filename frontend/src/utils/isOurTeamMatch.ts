import type { Match } from "../types";

/** Returns true if `keyword` appears in either team name of the given match. */
export function isOurTeamMatch(
  match: Match | null | undefined,
  keyword: string,
): boolean {
  if (!keyword || !match) return false;
  const kw = keyword.toLowerCase();
  const home = match.homeTeam?.name?.toLowerCase() ?? "";
  const away = match.awayTeam?.name?.toLowerCase() ?? "";
  return home.includes(kw) || away.includes(kw);
}
