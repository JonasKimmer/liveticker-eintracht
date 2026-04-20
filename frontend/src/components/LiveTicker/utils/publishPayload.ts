import { parseCommand } from "./parseCommand";
import { COMMAND_PALETTE } from "../components/entry/CommandPalette";

/**
 * Gibt { text, icon } für einen Publish-Vorgang zurück.
 * - Valid Command (/g Müller Eintracht) → formatierter Text + Icon
 * - Bekannter Command + Freitext (/og Müller trifft...) → Freitext + Icon
 * - Bekannter Command allein (/og) → Command-Beschreibung + Icon
 */
export function resolvePublishPayload(
  rawText: string,
  minute: number | null,
): { text: string; icon: string | null } {
  const text = rawText.trim();
  if (!text.startsWith("/")) return { text, icon: null };
  const parsed = parseCommand(text, minute ?? 0);
  if (parsed.isValid)
    return { text: parsed.formatted, icon: parsed.meta.icon ?? null };
  if (parsed.meta?.icon) {
    const stripped = text.replace(/^\/\w+\s*/, "").trim();
    const cmdToken = text.split(/\s+/)[0].toLowerCase();
    const cmdEntry = COMMAND_PALETTE.filter(Boolean).find(
      (c) => c.cmd === cmdToken,
    );
    return {
      text: stripped || cmdEntry?.desc || parsed.formatted,
      icon: parsed.meta.icon,
    };
  }
  return { text, icon: null };
}
