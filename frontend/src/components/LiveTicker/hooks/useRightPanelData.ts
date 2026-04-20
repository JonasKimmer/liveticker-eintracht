import { useMemo, useCallback } from "react";
import type { Match, MatchEvent, Player, LineupEntry, PlayerStat, MatchStat, InjuryGroup } from "../../../types";

/**
 * Berechnet alle abgeleiteten Daten für RightPanel.
 * Kein State, keine Side-Effects — nur memoized Derivationen.
 */
interface UseRightPanelDataParams {
  match: Match | null;
  matchStats: MatchStat[];
  players: Player[];
  playerStats?: PlayerStat[];
  lineups: LineupEntry[];
  events?: MatchEvent[];
  injuries?: InjuryGroup[];
}

export function useRightPanelData({
  match,
  matchStats,
  players,
  playerStats = [],
  lineups,
  events = [],
  injuries = [],
}: UseRightPanelDataParams) {
  const homeAbbr = match?.homeTeam?.name ?? "Heim";
  const awayAbbr = match?.awayTeam?.name ?? "Gast";

  // externalId (Partner-API) → interne DB-ID
  const extToInternal = useMemo(() => {
    const map: Record<number, number> = {};
    for (const pl of players) {
      if (pl.externalId != null) map[pl.externalId] = pl.id;
    }
    return map;
  }, [players]);

  // subMinuteMap: playerId → Auswechselminute; "in_<id>" → Einwechselminute
  const subMinuteMap = useMemo(() => {
    const map: Record<string | number, number> = {};
    for (const ev of events) {
      if (ev.liveTickerEventType !== "substitution") continue;
      try {
        const d = typeof ev.description === "string" ? JSON.parse(ev.description) : ev.description;
        const outExt = d?.player_id;
        const inExt  = d?.assist_id;
        if (outExt && ev.time) {
          map[outExt] = ev.time;
          const outInt = extToInternal[outExt];
          if (outInt) map[outInt] = ev.time;
        }
        if (inExt && ev.time) {
          map[`in_${inExt}`] = ev.time;
          const inInt = extToInternal[inExt];
          if (inInt) map[`in_${inInt}`] = ev.time;
        }
      } catch { /* ignore malformed descriptions */ }
    }
    return map;
  }, [events, extToInternal]);

  const playerName = useCallback((playerId: number | undefined | null) => {
    if (!playerId) return null;
    const p = players.find((pl) => pl.id === playerId);
    if (!p) return null;
    return p.knownName || p.displayName || `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || null;
  }, [players]);

  const homeStats  = useMemo(() => matchStats.find((s) => s.teamId === match?.teamHomeId), [matchStats, match]);
  const awayStats  = useMemo(() => matchStats.find((s) => s.teamId === match?.teamAwayId), [matchStats, match]);
  const homeLineup = useMemo(() => lineups.filter((l) => l.teamId === match?.teamHomeId),  [lineups, match]);
  const awayLineup = useMemo(() => lineups.filter((l) => l.teamId === match?.teamAwayId),  [lineups, match]);

  const topHome = useMemo(() =>
    playerStats
      .filter((s) => s.teamId === match?.teamHomeId && s.rating != null)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 3)
      .map((s) => ({ ...s, resolvedName: playerName(s.playerId) })),
    [playerStats, match, playerName]);

  const topAway = useMemo(() =>
    playerStats
      .filter((s) => s.teamId === match?.teamAwayId && s.rating != null)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 3)
      .map((s) => ({ ...s, resolvedName: playerName(s.playerId) })),
    [playerStats, match, playerName]);

  const topScorers = useMemo(() =>
    [...lineups]
      .filter((l) => l.numberOfGoals > 0)
      .sort((a, b) => b.numberOfGoals - a.numberOfGoals)
      .slice(0, 5)
      .map((l) => ({
        ...l,
        resolvedName: playerName(l.playerId),
        teamAbbr: l.teamId === match?.teamHomeId ? homeAbbr : awayAbbr,
      })),
    [lineups, match, playerName, homeAbbr, awayAbbr]);

  const withCards = useMemo(() =>
    lineups
      .filter((l) => l.hasYellowCard || l.hasRedCard)
      .map((l) => ({
        ...l,
        resolvedName: playerName(l.playerId),
        teamAbbr: l.teamId === match?.teamHomeId ? homeAbbr : awayAbbr,
      })),
    [lineups, match, playerName, homeAbbr, awayAbbr]);

  const homeStarters = useMemo(() => homeLineup.filter((p) => p.status === "Start"), [homeLineup]);
  const homeSubs     = useMemo(() => homeLineup.filter((p) => p.status === "Sub"),   [homeLineup]);
  const homeCoach    = useMemo(() => homeLineup.find((p)  => p.status === "Coach"),  [homeLineup]);
  const awayStarters = useMemo(() => awayLineup.filter((p) => p.status === "Start"), [awayLineup]);
  const awaySubs     = useMemo(() => awayLineup.filter((p) => p.status === "Sub"),   [awayLineup]);
  const awayCoach    = useMemo(() => awayLineup.find((p)  => p.status === "Coach"),  [awayLineup]);

  const injuriesBlock = useMemo(() => {
    if (!injuries.length || !match) return null;

    const homeGroups = injuries.filter(
      (g) => g.team_id === match.homeTeam?.externalId || g.team_name === match.homeTeam?.name,
    );
    const awayGroups = injuries.filter(
      (g) => g.team_id === match.awayTeam?.externalId || g.team_name === match.awayTeam?.name,
    );

    const dedupPlayers = (groups: typeof injuries) => {
      const seen = new Set<string>();
      return groups.flatMap((g) => g.players ?? []).filter((p) => {
        const key = p.player_name ?? p.name ?? "";
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };

    return {
      homePlayers: dedupPlayers(homeGroups),
      awayPlayers: dedupPlayers(awayGroups),
      homeName: homeGroups[0]?.team_name ?? homeAbbr,
      awayName: awayGroups[0]?.team_name ?? awayAbbr,
    };
  }, [injuries, match, homeAbbr, awayAbbr]);

  return {
    homeAbbr,
    awayAbbr,
    homeStats,
    awayStats,
    homeLineup,
    awayLineup,
    homeStarters,
    homeSubs,
    homeCoach,
    awayStarters,
    awaySubs,
    awayCoach,
    topHome,
    topAway,
    topScorers,
    withCards,
    injuriesBlock,
    playerName,
    subMinuteMap,
  };
}
