import { resolvePublishPayload } from "../../utils/publishPayload";

describe("resolvePublishPayload", () => {
  test("freier Text ohne Slash → icon null, Text unverändert", () => {
    const result = resolvePublishPayload("Hallo Welt!", 30);
    expect(result.icon).toBeNull();
    expect(result.text).toBe("Hallo Welt!");
  });

  test("gültiger Tor-Command → formatierter Text + ⚽ Icon", () => {
    const result = resolvePublishPayload("/g Müller EIN", 32);
    expect(result.icon).toBe("⚽");
    expect(result.text).toMatch(/TOR/);
  });

  test("bekannter Command + Freitext → Freitext + Command-Icon", () => {
    const result = resolvePublishPayload("/g Müller trifft wunderschön!", 45);
    // Nicht-valider Command (kein Team), aber Icon soll von /g kommen
    expect(result.icon).toBe("⚽");
    expect(result.text).not.toMatch(/^\//); // kein slash-prefix im Text
  });

  test("gültiger Gelb-Command → 🟨 Icon", () => {
    const result = resolvePublishPayload("/gelb Hinteregger EIN", 55);
    expect(result.icon).toBe("🟨");
  });

  test("gültiger Wechsel-Command → 🔄 Icon", () => {
    const result = resolvePublishPayload("/s KoloMuani Lindstrom EIN", 60);
    expect(result.icon).toBe("🔄");
  });

  test("Phasen-Command /abpfiff → formatierter Text", () => {
    const result = resolvePublishPayload("/abpfiff", 90);
    expect(result.text).toBe("Abpfiff!");
    expect(result.icon).toBe("📣");
  });

  test("leerer String → kein Crash", () => {
    expect(() => resolvePublishPayload("", 0)).not.toThrow();
  });
});
