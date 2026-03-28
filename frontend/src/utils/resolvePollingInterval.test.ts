import { resolvePollingInterval } from "./resolvePollingInterval";
import { POLL_EVENTS_MS, POLL_PREMATCH_MS } from "../components/LiveTicker/constants";

describe("resolvePollingInterval", () => {
  test("Live → POLL_EVENTS_MS", () => {
    expect(resolvePollingInterval("Live")).toBe(POLL_EVENTS_MS);
  });

  test("FullTime → POLL_EVENTS_MS", () => {
    expect(resolvePollingInterval("FullTime")).toBe(POLL_EVENTS_MS);
  });

  test("null (noch am Laden) → POLL_EVENTS_MS", () => {
    expect(resolvePollingInterval(null)).toBe(POLL_EVENTS_MS);
  });

  test("PreMatch → POLL_PREMATCH_MS", () => {
    expect(resolvePollingInterval("PreMatch")).toBe(POLL_PREMATCH_MS);
  });

  test("Cancelled → POLL_PREMATCH_MS", () => {
    expect(resolvePollingInterval("Cancelled")).toBe(POLL_PREMATCH_MS);
  });

  test("unbekannter State → POLL_PREMATCH_MS", () => {
    expect(resolvePollingInterval("SomethingElse")).toBe(POLL_PREMATCH_MS);
  });
});
