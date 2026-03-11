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
 * Unterstützt normalisierte Typen (goal, yellow_card, ...) und Legacy-Typen (Goal, Card, subst).
 */
export function getEventMeta(eventType, detail = "") {
  const t = eventType?.toLowerCase();
  if (t === "goal") return { icon: "⚽", cssClass: "goal" };
  if (t === "own_goal") return { icon: "⚽", cssClass: "goal" };
  if (t === "missed_penalty") return { icon: "❌", cssClass: "card" };
  if (t === "yellow_card") return { icon: "🟨", cssClass: "card" };
  if (t === "red_card") return { icon: "🟥", cssClass: "card" };
  if (t === "substitution") return { icon: "🔄", cssClass: "sub" };
  if (t === "kick_off" || t === "match_kickoff" || t === "match_second_half" || t === "extra_time_start") return { icon: "📣", cssClass: "" };
  if (t === "halftime" || t === "match_halftime" || t === "extra_halftime" || t === "halftime_comment") return { icon: "🔔", cssClass: "" };
  if (t === "fulltime" || t === "match_fulltime" || t === "fulltime_aet" || t === "fulltime_pen") return { icon: "📣", cssClass: "" };
  if (t === "match_penalties") return { icon: "🥅", cssClass: "" };
  if (t === "comment" || t === "var") return { icon: "📢", cssClass: "" };
  if (t === "pre_match" || t === "post_match") return { icon: "📣", cssClass: "" };
  // Legacy API-Football Typen
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
 * Unterstützt normalisierte Typen und description-JSON.
 */
export function getRawEventText(event) {
  // Normalisierter Typ aus Partner-API Response
  const eventType = event.liveTickerEventType || event.type;
  const t = eventType?.toLowerCase();

  // description ist JSON-String im Partner-API Format
  let desc = {};
  try {
    if (event.description) desc = JSON.parse(event.description);
  } catch {}
  const player = desc.player_name || event.player_name || "";
  const assist = desc.assist_name || event.assist_name || "";
  const detail = desc.detail || event.detail || "";

  if (t === "goal") return `Tor! ${player}${assist ? ` (Assist: ${assist})` : ""}`;
  if (t === "own_goal") return `Eigentor! ${player}`;
  if (t === "missed_penalty") return `Elfmeter verschossen — ${player}`;
  if (t === "yellow_card") return `Gelb — ${player}`;
  if (t === "red_card") return `Rot — ${player}`;
  if (t === "substitution") return `${player} ↔ ${assist}`;
  if (t === "kick_off") return "Anstoß";
  if (t === "halftime") return "Halbzeit";
  if (t === "fulltime") return "Abpfiff";
  // Legacy
  if (eventType === "Goal") return `Tor! ${player}${assist ? ` (Assist: ${assist})` : ""}`;
  if (eventType === "Card") return `${detail} — ${player}`;
  if (eventType === "subst") return `${player} ↔ ${assist}`;
  return detail;
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
