import { renderHook, act } from "@testing-library/react";
import { useMatchEvents } from "./useMatchEvents";
import * as api from "api";

jest.mock("api");

describe("useMatchEvents", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    api.fetchEvents.mockResolvedValue({ data: { items: [] } });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("gibt leeres Array zurück wenn selectedMatchId null", () => {
    const { result } = renderHook(() => useMatchEvents(null, null));
    expect(result.current.events).toEqual([]);
    expect(api.fetchEvents).not.toHaveBeenCalled();
  });

  test("lädt Events beim Mount und kehrt Reihenfolge um", async () => {
    api.fetchEvents.mockResolvedValue({
      data: { items: [{ id: 1 }, { id: 2 }, { id: 3 }] },
    });
    const { result } = renderHook(() => useMatchEvents(42, null));
    await act(async () => {});
    expect(api.fetchEvents).toHaveBeenCalledWith(42);
    expect(result.current.events).toEqual([{ id: 3 }, { id: 2 }, { id: 1 }]);
  });

  test("unterstützt flaches Array (kein items-Wrapper)", async () => {
    api.fetchEvents.mockResolvedValue({ data: [{ id: 10 }, { id: 20 }] });
    const { result } = renderHook(() => useMatchEvents(5, null));
    await act(async () => {});
    expect(result.current.events).toEqual([{ id: 20 }, { id: 10 }]);
  });

  test("setzt events auf [] zurück wenn selectedMatchId wechselt", async () => {
    api.fetchEvents.mockResolvedValue({ data: { items: [{ id: 1 }] } });
    const { result, rerender } = renderHook(
      ({ id }) => useMatchEvents(id, null),
      { initialProps: { id: 1 } },
    );
    await act(async () => {});
    expect(result.current.events).toHaveLength(1);

    api.fetchEvents.mockResolvedValue({ data: { items: [] } });
    rerender({ id: 2 });
    expect(result.current.events).toEqual([]);
  });

  test("reload.loadEvents ruft API erneut auf", async () => {
    const { result } = renderHook(() => useMatchEvents(42, null));
    await act(async () => {});
    api.fetchEvents.mockClear();

    await act(async () => {
      await result.current.reload.loadEvents();
    });
    expect(api.fetchEvents).toHaveBeenCalledTimes(1);
  });

  test("kein Fehler wenn API wirft", async () => {
    api.fetchEvents.mockRejectedValue(new Error("network"));
    const { result } = renderHook(() => useMatchEvents(42, null));
    await act(async () => {});
    expect(result.current.events).toEqual([]);
  });
});
