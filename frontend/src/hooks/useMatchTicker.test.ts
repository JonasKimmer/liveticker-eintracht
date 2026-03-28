import { renderHook, act } from "@testing-library/react";
import { useMatchTicker } from "./useMatchTicker";
import * as api from "../api";

jest.mock("../api");

describe("useMatchTicker", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    api.fetchTickerTexts.mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("gibt leeres Array zurück wenn selectedMatchId null", () => {
    const { result } = renderHook(() => useMatchTicker(null, null));
    expect(result.current.tickerTexts).toEqual([]);
    expect(api.fetchTickerTexts).not.toHaveBeenCalled();
  });

  test("lädt tickerTexts beim Mount", async () => {
    const texts = [{ id: 1, text: "Tor!" }, { id: 2, text: "Einwurf" }];
    api.fetchTickerTexts.mockResolvedValue({ data: texts });
    const { result } = renderHook(() => useMatchTicker(42, null));
    await act(async () => {});
    expect(api.fetchTickerTexts).toHaveBeenCalledWith(42);
    expect(result.current.tickerTexts).toEqual(texts);
  });

  test("setzt tickerTexts auf [] zurück wenn selectedMatchId wechselt", async () => {
    api.fetchTickerTexts.mockResolvedValue({ data: [{ id: 1 }] });
    const { result, rerender } = renderHook(
      ({ id }) => useMatchTicker(id, null),
      { initialProps: { id: 1 } },
    );
    await act(async () => {});
    expect(result.current.tickerTexts).toHaveLength(1);

    api.fetchTickerTexts.mockResolvedValue({ data: [] });
    rerender({ id: 2 });
    expect(result.current.tickerTexts).toEqual([]);
  });

  test("reload.loadTickerTexts ruft API erneut auf", async () => {
    const { result } = renderHook(() => useMatchTicker(42, null));
    await act(async () => {});
    api.fetchTickerTexts.mockClear();

    await act(async () => {
      await result.current.reload.loadTickerTexts();
    });
    expect(api.fetchTickerTexts).toHaveBeenCalledTimes(1);
  });

  test("kein Fehler wenn API wirft", async () => {
    api.fetchTickerTexts.mockRejectedValue(new Error("network"));
    const { result } = renderHook(() => useMatchTicker(42, null));
    await act(async () => {});
    expect(result.current.tickerTexts).toEqual([]);
  });
});
