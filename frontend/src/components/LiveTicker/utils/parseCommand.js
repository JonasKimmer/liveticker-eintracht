/**
 * parseCommand — wandelt Slash-Commands in formatierte Ticker-Texte um.
 *
 * Unterstützte Commands:
 *   /goal [spieler] [team]
 *   /card [spieler] [team] [yellow|red]
 *   /sub  [spieler-ein] [spieler-aus] [team]
 *   /note [freitext...]
 *
 * Kurzformen: /g, /c, /s, /n
 *
 * @param {string} input          - Roheingabe aus dem Textarea
 * @param {number} currentMinute  - Aktuelle Spielminute (für Formatierung)
 * @returns {{ type: string, formatted: string, warnings: string[], isValid: boolean }}
 */

const CMD_MAP = {
  "/goal": "goal",
  "/g": "goal",
  "/card": "card",
  "/c": "card",
  "/sub": "sub",
  "/s": "sub",
  "/note": "note",
  "/n": "note",
};

const CARD_COLORS = {
  yellow: { emoji: "🟨", label: "Gelb" },
  y: { emoji: "🟨", label: "Gelb" },
  red: { emoji: "🟥", label: "Rot" },
  r: { emoji: "🟥", label: "Rot" },
  gelb: { emoji: "🟨", label: "Gelb" },
  rot: { emoji: "🟥", label: "Rot" },
};

export function parseCommand(input, currentMinute = 0) {
  const trimmed = (input ?? "").trim();

  if (!trimmed.startsWith("/")) {
    return {
      type: "invalid",
      formatted: trimmed,
      warnings: [],
      isValid: false,
    };
  }

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  const cmdToken = tokens[0]?.toLowerCase();
  const commandType = CMD_MAP[cmdToken];

  if (!commandType) {
    return {
      type: "invalid",
      formatted: trimmed,
      warnings: [`Unbekannter Command: ${cmdToken}`],
      isValid: false,
    };
  }

  const args = tokens.slice(1);
  const min = currentMinute > 0 ? `${currentMinute}'` : "??'";

  switch (commandType) {
    case "goal": {
      const player = args[0];
      const team = args[1];
      const warnings = [];
      if (!player) warnings.push("Fehlend: Spieler");
      if (!team) warnings.push("Fehlend: Team");
      return {
        type: "goal",
        formatted: `${min} ⚽ TOR — ${player ?? "[SPIELER]"} (${team ?? "[TEAM]"})`,
        warnings,
        isValid: !!(player && team),
      };
    }

    case "card": {
      const colorArg = args.find((a) => CARD_COLORS[a.toLowerCase()]);
      const cardColor = colorArg
        ? CARD_COLORS[colorArg.toLowerCase()]
        : CARD_COLORS.yellow;
      const remaining = args.filter(
        (a) => a.toLowerCase() !== colorArg?.toLowerCase(),
      );
      const player = remaining[0];
      const team = remaining[1];
      const warnings = [];
      if (!player) warnings.push("Fehlend: Spieler");
      if (!team) warnings.push("Fehlend: Team");
      return {
        type: "card",
        formatted: `${min} ${cardColor.emoji} KARTE — ${player ?? "[SPIELER]"} (${team ?? "[TEAM]"})`,
        warnings,
        isValid: !!(player && team),
      };
    }

    case "sub": {
      const playerIn = args[0];
      const playerOut = args[1];
      const team = args[2];
      const warnings = [];
      if (!playerIn) warnings.push("Fehlend: Spieler ein");
      if (!playerOut) warnings.push("Fehlend: Spieler aus");
      if (!team) warnings.push("Fehlend: Team");
      return {
        type: "sub",
        formatted: `${min} 🔄 WECHSEL — ${playerIn ?? "[EIN]"} ↔ ${playerOut ?? "[AUS]"} (${team ?? "[TEAM]"})`,
        warnings,
        isValid: !!(playerIn && playerOut && team),
      };
    }

    case "note": {
      const noteText = args.join(" ");
      const warnings = noteText ? [] : ["Fehlend: Text"];
      return {
        type: "note",
        formatted: `${min} — ${noteText || "[TEXT]"}`,
        warnings,
        isValid: !!noteText,
      };
    }

    default:
      return {
        type: "invalid",
        formatted: trimmed,
        warnings: ["Ungültiger Command"],
        isValid: false,
      };
  }
}

/**
 * Hilfsfunktion: Gibt Icon + CSS-Klasse für einen Event-Typ zurück.
 */
export function getEventMeta(eventType, detail = "") {
  if (eventType === "Goal") return { icon: "⚽", cssClass: "goal" };
  if (eventType === "Card")
    return {
      icon: detail?.toLowerCase().includes("red") ? "🟥" : "🟨",
      cssClass: "card",
    };
  if (eventType === "subst") return { icon: "🔄", cssClass: "sub" };
  return { icon: "•", cssClass: "" };
}

/**
 * Hilfsfunktion: Rohtext für ein Event (ohne AI-Text).
 */
export function getRawEventText(event) {
  if (event.type === "Goal") {
    const assist =
      event.assist_name && event.assist_name !== "null"
        ? ` (Assist: ${event.assist_name})`
        : "";
    return `Tor! ${event.player_name}${assist}`;
  }
  if (event.type === "Card") return `${event.detail} — ${event.player_name}`;
  if (event.type === "subst")
    return `${event.player_name} ↔ ${event.assist_name}`;
  return event.detail ?? "";
}

/**
 * Hilfsfunktion: Match-Status normalisieren.
 */
export function normalizeMatchStatus(status) {
  const LIVE = ["1H", "2H", "HT", "ET", "live"];
  const FINISHED = ["FT", "AET", "PEN", "finished"];
  if (LIVE.includes(status)) return "live";
  if (FINISHED.includes(status)) return "finished";
  return "scheduled";
}
