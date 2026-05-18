import { knockoutThreshold, makeRoundLabel } from "./roundLabel";

// ── knockoutThreshold ────────────────────────────────────────────────────────

describe("knockoutThreshold", () => {
  test("returns count of consecutive rounds starting at 1", () => {
    expect(knockoutThreshold([1, 2, 3, 4, 5, 6])).toBe(6);
  });

  test("returns 0 for empty array", () => {
    expect(knockoutThreshold([])).toBe(0);
  });

  test("stops at gap (e.g. 1,2,3,5 → threshold 3)", () => {
    expect(knockoutThreshold([1, 2, 3, 5])).toBe(3);
  });

  test("mixed group + knockout rounds returns only group count", () => {
    // [1, 2, 3, 4, 8, 16] → consecutive 1–4 → threshold 4
    expect(knockoutThreshold([1, 2, 3, 4, 8, 16])).toBe(4);
  });

  test("single round 1 → threshold 1", () => {
    expect(knockoutThreshold([1])).toBe(1);
  });

  test("rounds starting > 1 → threshold 0", () => {
    expect(knockoutThreshold([4, 8, 16])).toBe(0);
  });
});

// ── makeRoundLabel ────────────────────────────────────────────────────────────

describe("makeRoundLabel", () => {
  describe("group stage rounds", () => {
    const { short, full } = makeRoundLabel([1, 2, 3, 4, 5, 6]);

    test("short: returns round number as string", () => {
      expect(short(1)).toBe("1");
      expect(short(5)).toBe("5");
    });

    test("full: returns 'Spieltag N' for group rounds", () => {
      expect(full(1)).toBe("Spieltag 1");
      expect(full(6)).toBe("Spieltag 6");
    });
  });

  describe("knockout rounds", () => {
    const { short, full } = makeRoundLabel([4, 8, 16]); // threshold = 0 → all knockout

    test("short: Finale (2) → 'FIN'", () => {
      expect(short(2)).toBe("FIN");
    });

    test("short: Halbfinale (4) → 'HF'", () => {
      expect(short(4)).toBe("HF");
    });

    test("full: Halbfinale (4) → 'Halbfinale'", () => {
      expect(full(4)).toBe("Halbfinale");
    });

    test("full: Achtelfinale (16) → 'Achtelfinale'", () => {
      expect(full(16)).toBe("Achtelfinale");
    });

    test("unknown knockout round → fallback string", () => {
      expect(typeof short(999)).toBe("string");
      expect(typeof full(999)).toBe("string");
    });
  });

  describe("mixed rounds", () => {
    const { full } = makeRoundLabel([1, 2, 3, 4, 8, 16]);

    test("group rounds get Spieltag label", () => {
      expect(full(3)).toBe("Spieltag 3");
    });

    test("knockout rounds get named label", () => {
      expect(full(4)).toBe("Spieltag 4"); // 4 is within threshold
      expect(full(8)).toBe("Viertelfinale"); // 8 > threshold of 4
    });
  });

  describe("empty rounds array", () => {
    test("handles empty array without crash", () => {
      const { short, full } = makeRoundLabel([]);
      expect(() => short(1)).not.toThrow();
      expect(() => full(1)).not.toThrow();
    });
  });
});
