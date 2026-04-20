import { renderHook } from "@testing-library/react";
import { useRightPanelData } from "./useRightPanelData";

function makeLineupEntry(id, teamId, status = "Start") {
  return { id, playerId: id, teamId, status, position: "M", jerseyNumber: id };
}

const HOME_TEAM_ID = 1;
const AWAY_TEAM_ID = 2;

const defaultMatch = {
  teamHomeId: HOME_TEAM_ID,
  teamAwayId: AWAY_TEAM_ID,
  homeTeam: { name: "Eintracht Frankfurt", initials: "SGE" },
  awayTeam: { name: "FC Bayern", initials: "FCB" },
};

const defaultProps = {
  match: defaultMatch,
  players: [],
  lineups: [],
  matchStats: [],
  playerStats: [],
  events: [],
  injuries: [],
};

describe("useRightPanelData", () => {
  test("returns expected shape", () => {
    const { result } = renderHook(() => useRightPanelData(defaultProps));
    expect(result.current).toHaveProperty("homeAbbr");
    expect(result.current).toHaveProperty("awayAbbr");
    expect(result.current).toHaveProperty("playerName");
    expect(result.current).toHaveProperty("homeLineup");
    expect(result.current).toHaveProperty("awayLineup");
    expect(result.current).toHaveProperty("topScorers");
    expect(result.current).toHaveProperty("withCards");
  });

  test("homeAbbr and awayAbbr use team name", () => {
    const { result } = renderHook(() => useRightPanelData(defaultProps));
    expect(result.current.homeAbbr).toBe("Eintracht Frankfurt");
    expect(result.current.awayAbbr).toBe("FC Bayern");
  });

  test("falls back to 'Heim'/'Gast' when match is null", () => {
    const { result } = renderHook(() =>
      useRightPanelData({ ...defaultProps, match: null })
    );
    expect(result.current.homeAbbr).toBe("Heim");
    expect(result.current.awayAbbr).toBe("Gast");
  });

  test("playerName returns null for unknown id", () => {
    const { result } = renderHook(() => useRightPanelData(defaultProps));
    expect(result.current.playerName(9999)).toBeNull();
  });

  test("playerName returns null for falsy id", () => {
    const { result } = renderHook(() => useRightPanelData(defaultProps));
    expect(result.current.playerName(null)).toBeNull();
    expect(result.current.playerName(0)).toBeNull();
  });

  test("playerName resolves name from players array", () => {
    const props = {
      ...defaultProps,
      players: [{ id: 42, name: "Thomas Müller", displayName: "Müller" }],
    };
    const { result } = renderHook(() => useRightPanelData(props));
    const name = result.current.playerName(42);
    expect(name).toBeTruthy();
    expect(typeof name).toBe("string");
  });

  test("homeLineup filters by teamHomeId", () => {
    const props = {
      ...defaultProps,
      lineups: [
        makeLineupEntry(1, HOME_TEAM_ID),
        makeLineupEntry(2, HOME_TEAM_ID),
        makeLineupEntry(3, AWAY_TEAM_ID),
      ],
    };
    const { result } = renderHook(() => useRightPanelData(props));
    expect(result.current.homeLineup).toHaveLength(2);
    expect(result.current.awayLineup).toHaveLength(1);
  });

  test("empty lineups returns empty arrays", () => {
    const { result } = renderHook(() => useRightPanelData(defaultProps));
    expect(result.current.homeLineup).toHaveLength(0);
    expect(result.current.awayLineup).toHaveLength(0);
  });

  test("topScorers returns array", () => {
    const { result } = renderHook(() => useRightPanelData(defaultProps));
    expect(Array.isArray(result.current.topScorers)).toBe(true);
  });

  test("withCards returns array", () => {
    const { result } = renderHook(() => useRightPanelData(defaultProps));
    expect(Array.isArray(result.current.withCards)).toBe(true);
  });
});
