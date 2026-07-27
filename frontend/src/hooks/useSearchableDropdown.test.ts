import { renderHook, act } from "@testing-library/react";
import { useSearchableDropdown } from "./useSearchableDropdown";

const countries = ["Germany", "France", "Spain", "Italy", "Portugal"];

function setup(overrides = {}) {
  const onSelect = jest.fn();
  const { result } = renderHook(() =>
    useSearchableDropdown({
      items: countries,
      onSelect,
      getLabel: (c) => c,
      getValue: (c) => c,
      ...overrides,
    }),
  );
  return { result, onSelect };
}

describe("useSearchableDropdown", () => {
  test("initially closed with empty query", () => {
    const { result } = setup();
    expect(result.current.open).toBe(false);
    expect(result.current.query).toBe("");
  });

  test("handleOpen sets open to true", () => {
    const { result } = setup();
    act(() => {
      result.current.handleOpen();
    });
    expect(result.current.open).toBe(true);
  });

  test("all items shown when query is empty", () => {
    const { result } = setup();
    act(() => {
      result.current.handleOpen();
    });
    expect(result.current.filtered).toHaveLength(countries.length);
  });

  test("filters items by query", () => {
    const { result } = setup();
    act(() => {
      result.current.handleOpen();
    });
    act(() => {
      result.current.setQuery("ger");
    });
    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0].label).toBe("Germany");
  });

  test("filter is case-insensitive", () => {
    const { result } = setup();
    act(() => {
      result.current.handleOpen();
    });
    act(() => {
      result.current.setQuery("GER");
    });
    expect(result.current.filtered).toHaveLength(1);
  });

  test("empty results when no match", () => {
    const { result } = setup();
    act(() => {
      result.current.handleOpen();
    });
    act(() => {
      result.current.setQuery("zzz");
    });
    expect(result.current.filtered).toHaveLength(0);
  });

  test("handleSelect calls onSelect and closes dropdown", () => {
    const { result, onSelect } = setup();
    act(() => {
      result.current.handleOpen();
    });
    act(() => {
      result.current.handleSelect("Germany");
    });
    expect(onSelect).toHaveBeenCalledWith("Germany");
    expect(result.current.open).toBe(false);
    expect(result.current.query).toBe("");
  });

  test("handleClose closes dropdown and clears query", () => {
    const { result } = setup();
    act(() => {
      result.current.handleOpen();
    });
    act(() => {
      result.current.setQuery("ger");
    });
    act(() => {
      result.current.handleClose();
    });
    expect(result.current.open).toBe(false);
    expect(result.current.query).toBe("");
  });

  test("filtered items have key, label, val structure", () => {
    const { result } = setup();
    act(() => {
      result.current.handleOpen();
    });
    const first = result.current.filtered[0];
    expect(first).toHaveProperty("key");
    expect(first).toHaveProperty("label");
    expect(first).toHaveProperty("val");
  });

  test("does not open when disabled", () => {
    const { result } = setup({ disabled: true });
    act(() => {
      result.current.handleOpen();
    });
    expect(result.current.open).toBe(false);
  });
});
