// @ts-nocheck
import { parseCommand, getEventMeta } from "./parseCommand";
import { normalizeMatchStatus } from "../../../utils/matchStatus";

// ──────────────────────────────────────────────
// parseCommand
// ──────────────────────────────────────────────

describe("parseCommand — Tor (/g)", () => {
  test("vollständiger Command ist valid", () => {
    const result = parseCommand("/g Müller EIN", 32);
    expect(result.isValid).toBe(true);
    expect(result.type).toBe("goal");
    expect(result.formatted).toBe("TOR — Müller (EIN)");
    expect(result.meta.icon).toBe("⚽");
    expect(result.warnings).toHaveLength(0);
  });

  test("ohne Spieler und Team → invalid mit Warnings", () => {
    const result = parseCommand("/g", 10);
    expect(result.isValid).toBe(false);
    expect(result.warnings).toContain("Fehlend: Spieler");
    expect(result.warnings).toContain("Fehlend: Team");
  });

  test("nur Spieler, kein Team → invalid", () => {
    const result = parseCommand("/g Müller", 10);
    expect(result.isValid).toBe(false);
    expect(result.warnings).toContain("Fehlend: Team");
  });

  test("/goal alias funktioniert", () => {
    const result = parseCommand("/goal Müller EIN", 5);
    expect(result.isValid).toBe(true);
    expect(result.type).toBe("goal");
  });

  test("Minute aus currentMinute übernommen", () => {
    const result = parseCommand("/g Müller EIN", 42);
    expect(result.meta.minute).toBe(42);
  });
});

describe("parseCommand — Gelbe Karte (/gelb)", () => {
  test("vollständiger Command → valid mit 🟨", () => {
    const result = parseCommand("/gelb Hinteregger EIN", 55);
    expect(result.isValid).toBe(true);
    expect(result.meta.icon).toBe("🟨");
    expect(result.formatted).toMatch(/Gelb/);
  });

  test("ohne Args → Warnings", () => {
    const result = parseCommand("/gelb");
    expect(result.isValid).toBe(false);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe("parseCommand — Rote Karte (/rot)", () => {
  test("vollständiger Command → valid mit 🟥", () => {
    const result = parseCommand("/rot Hinteregger EIN", 77);
    expect(result.isValid).toBe(true);
    expect(result.meta.icon).toBe("🟥");
    expect(result.formatted).toMatch(/Rote Karte/);
  });
});

describe("parseCommand — Wechsel (/s)", () => {
  test("vollständiger Command ist valid", () => {
    const result = parseCommand("/s Kolo Muani Lindstrom EIN", 60);
    expect(result.isValid).toBe(true);
    expect(result.type).toBe("sub");
    expect(result.meta.icon).toBe("🔄");
  });

  test("fehlender Spieler aus → invalid", () => {
    const result = parseCommand("/s KoloMuani", 60);
    expect(result.isValid).toBe(false);
    expect(result.warnings).toContain("Fehlend: Spieler aus");
  });
});

describe("parseCommand — Notiz (/n)", () => {
  test("mit Text → valid", () => {
    const result = parseCommand("/n Das war ein starkes Spiel");
    expect(result.isValid).toBe(true);
    expect(result.formatted).toBe("Das war ein starkes Spiel");
    expect(result.meta.icon).toBe("📝");
  });

  test("ohne Text → invalid", () => {
    const result = parseCommand("/n");
    expect(result.isValid).toBe(false);
    expect(result.warnings).toContain("Fehlend: Text");
  });
});

describe("parseCommand — Phasen-Commands", () => {
  test("/anpfiff mit Minute → valid", () => {
    const result = parseCommand("/anpfiff 1", 0);
    expect(result.isValid).toBe(true);
    expect(result.type).toBe("phase");
    expect(result.meta.phase).toBe("FirstHalf");
    expect(result.meta.minute).toBe(1);
    expect(result.formatted).toBe("Anpfiff!");
  });

  test("/anpfiff ohne Minute fällt auf currentMinute zurück", () => {
    const result = parseCommand("/anpfiff", 5);
    expect(result.isValid).toBe(true);
    expect(result.meta.minute).toBe(5);
  });

  test("/anpfiff ohne Minute und currentMinute=0 → invalid", () => {
    const result = parseCommand("/anpfiff", 0);
    expect(result.isValid).toBe(false);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  test("/hz → phase FirstHalfBreak", () => {
    const result = parseCommand("/hz", 0);
    expect(result.isValid).toBe(true);
    expect(result.meta.phase).toBe("FirstHalfBreak");
    expect(result.meta.icon).toBe("🔔");
  });

  test("/abpfiff → phase After", () => {
    const result = parseCommand("/abpfiff", 0);
    expect(result.isValid).toBe(true);
    expect(result.meta.phase).toBe("After");
  });

  test("/elfmeter → phase PenaltyShootout", () => {
    const result = parseCommand("/elfmeter", 0);
    expect(result.isValid).toBe(true);
    expect(result.meta.phase).toBe("PenaltyShootout");
    expect(result.meta.icon).toBe("🥅");
  });
});

describe("parseCommand — Eigentor und Elfmeter verschossen", () => {
  test("/og → own_goal", () => {
    const result = parseCommand("/og Eigenspieler EIN", 30);
    expect(result.isValid).toBe(true);
    expect(result.type).toBe("own_goal");
    expect(result.formatted).toMatch(/Eigentor/);
  });

  test("/ep → missed_penalty", () => {
    const result = parseCommand("/ep Spieler EIN", 80);
    expect(result.isValid).toBe(true);
    expect(result.type).toBe("missed_penalty");
    expect(result.meta.icon).toBe("❌");
  });
});

describe("parseCommand — Ungültige Eingaben", () => {
  test("kein Slash → invalid", () => {
    const result = parseCommand("Tor Müller");
    expect(result.isValid).toBe(false);
    expect(result.type).toBe("invalid");
  });

  test("leerer String → invalid", () => {
    const result = parseCommand("");
    expect(result.isValid).toBe(false);
  });

  test("null/undefined → invalid ohne crash", () => {
    expect(() => parseCommand(null)).not.toThrow();
    expect(() => parseCommand(undefined)).not.toThrow();
    expect(parseCommand(null).isValid).toBe(false);
  });

  test("unbekannter Command → Warnung", () => {
    const result = parseCommand("/xyz Arg1");
    expect(result.isValid).toBe(false);
    expect(result.warnings[0]).toMatch(/Unbekannter Command/);
  });
});

// ──────────────────────────────────────────────
// normalizeMatchStatus
// ──────────────────────────────────────────────

describe("normalizeMatchStatus", () => {
  test.each(["1H", "2H", "HT", "ET", "live", "Live"])("'%s' → live", (s) => {
    expect(normalizeMatchStatus(s)).toBe("live");
  });

  test.each(["FT", "AET", "PEN", "finished", "FullTime"])(
    "'%s' → finished",
    (s) => {
      expect(normalizeMatchStatus(s)).toBe("finished");
    },
  );

  test.each(["NS", "TBD", "", null, undefined])("'%s' → scheduled", (s) => {
    expect(normalizeMatchStatus(s)).toBe("scheduled");
  });
});

// ──────────────────────────────────────────────
// getEventMeta
// ──────────────────────────────────────────────

describe("getEventMeta", () => {
  test("goal → ⚽", () => {
    expect(getEventMeta("goal").icon).toBe("⚽");
  });

  test("yellow_card → 🟨", () => {
    expect(getEventMeta("yellow_card").icon).toBe("🟨");
  });

  test("red_card → 🟥", () => {
    expect(getEventMeta("red_card").icon).toBe("🟥");
  });

  test("substitution → 🔄", () => {
    expect(getEventMeta("substitution").icon).toBe("🔄");
  });

  test("unknown type → •", () => {
    expect(getEventMeta("foobar").icon).toBe("•");
  });
});
