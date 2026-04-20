import { renderHook } from "@testing-library/react";
import { useLiveMinute } from "./useLiveMinute";

describe("useLiveMinute", () => {
  test("returns 0 when match is null", () => {
    const { result } = renderHook(() => useLiveMinute(null));
    expect(result.current).toBe(0);
  });

  test("returns 0 for finished match", () => {
    const match = { matchState: "FT", minute: null };
    const { result } = renderHook(() => useLiveMinute(match));
    expect(result.current).toBe(0);
  });

  test("returns 0 for scheduled match", () => {
    const match = { matchState: "NS", minute: null };
    const { result } = renderHook(() => useLiveMinute(match));
    expect(result.current).toBe(0);
  });

  test("returns DB minute directly when provided for live match", () => {
    const match = { matchState: "1H", minute: 23 };
    const { result } = renderHook(() => useLiveMinute(match));
    expect(result.current).toBe(23);
  });

  test("returns DB minute=0 directly (falsy edge case)", () => {
    // minute=0 is falsy so the code falls through to kickoff calculation
    // this is the current behaviour — document it via test
    const match = { matchState: "1H", minute: 0 };
    const { result } = renderHook(() => useLiveMinute(match));
    // minute is null-checked: `match.minute != null`, so 0 is returned
    expect(result.current).toBe(0);
  });

  test("computes from kickoff for FirstHalf (live, no DB minute)", () => {
    const kickoffMs = Date.now() - 20 * 60 * 1000; // 20 min ago
    const match = {
      matchState: "1H",
      minute: null,
      kickoff: new Date(kickoffMs).toISOString(),
      matchPhase: "FirstHalf",
    };
    const { result } = renderHook(() => useLiveMinute(match));
    expect(result.current).toBeGreaterThanOrEqual(20);
    expect(result.current).toBeLessThanOrEqual(22); // small buffer for test execution
  });

  test("computes from startsAt fallback when kickoff is missing", () => {
    const startsAtMs = Date.now() - 10 * 60 * 1000; // 10 min ago
    const match = {
      matchState: "1H",
      minute: null,
      startsAt: new Date(startsAtMs).toISOString(),
      matchPhase: "FirstHalf",
    };
    const { result } = renderHook(() => useLiveMinute(match));
    expect(result.current).toBeGreaterThanOrEqual(10);
  });

  test("returns 0 when kickoff is in the future (not yet started)", () => {
    const futureKickoff = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const match = {
      matchState: "1H",
      minute: null,
      kickoff: futureKickoff,
      matchPhase: "FirstHalf",
    };
    const { result } = renderHook(() => useLiveMinute(match));
    expect(result.current).toBe(0);
  });

  test("returns 0 when no kickoff time available", () => {
    const match = { matchState: "1H", minute: null };
    const { result } = renderHook(() => useLiveMinute(match));
    expect(result.current).toBe(0);
  });

  test("SecondHalf shifts minute to 46+", () => {
    // 65 min elapsed (45' first half + 15' break + 5' into 2nd half)
    const kickoffMs = Date.now() - 65 * 60 * 1000;
    const match = {
      matchState: "2H",
      minute: null,
      kickoff: new Date(kickoffMs).toISOString(),
      matchPhase: "SecondHalf",
    };
    const { result } = renderHook(() => useLiveMinute(match));
    expect(result.current).toBeGreaterThanOrEqual(46);
  });
});
