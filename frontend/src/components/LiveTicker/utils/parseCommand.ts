/**
 * parseCommand — wandelt Slash-Commands in formatierte Ticker-Texte um.
 *
 * Event-Commands:   /g /goal  /c /card  /s /sub  /n /note
 * Phasen-Commands:  /anpfiff  /hz  /2hz  /pause  /vz1  /vzp  /vz2  /elfmeter  /abpfiff  /prematch
 *
 * Gibt zusätzlich { meta: { icon, phase, minute } } zurück.
 */

const CMD_MAP = {
  "/goal": "goal",
  "/g": "goal",
  "/card": "card",
  "/c": "card",
  "/gelb": "card_yellow",
  "/rot": "card_red",
  "/sub": "sub",
  "/s": "sub",
  "/note": "note",
  "/n": "note",
  "/og": "own_goal",
  "/ep": "missed_penalty",
};

const PHASE_CMDS = {
  "/prematch":  { text: "Vorbericht",                    phase: "Before",                icon: "📣", hasMinute: false },
  "/anpfiff":   { text: "Anpfiff!",                      phase: "FirstHalf",             icon: "📣", hasMinute: true  },
  "/hz":        { text: "Halbzeit!",                     phase: "FirstHalfBreak",        icon: "🔔", hasMinute: false },
  "/2hz":       { text: "Anstoß zur 2. Halbzeit",        phase: "SecondHalf",            icon: "📣", hasMinute: true  },
  "/pause":     { text: "Pause",                         phase: "SecondHalfBreak",       icon: "🔔", hasMinute: false },
  "/vz1":       { text: "Beginn der Verlängerung",       phase: "ExtraFirstHalf",        icon: "📣", hasMinute: true  },
  "/vzp":       { text: "Verlängerungspause",            phase: "ExtraBreak",            icon: "🔔", hasMinute: false },
  "/vz2":       { text: "2. Hälfte der Verlängerung",    phase: "ExtraSecondHalf",       icon: "📣", hasMinute: true  },
  "/elfp":      { text: "Elfmeterpause",                 phase: "ExtraSecondHalfBreak",  icon: "🔔", hasMinute: false },
  "/elfmeter":  { text: "Elfmeterschießen beginnt",      phase: "PenaltyShootout",       icon: "🥅", hasMinute: false },
  "/abpfiff":   { text: "Abpfiff!",                      phase: "After",                 icon: "📣", hasMinute: false },
};

const CARD_COLORS = {
  yellow: { emoji: "🟨", label: "Gelb" },
  y:      { emoji: "🟨", label: "Gelb" },
  red:    { emoji: "🟥", label: "Rot"  },
  r:      { emoji: "🟥", label: "Rot"  },
  gelb:   { emoji: "🟨", label: "Gelb" },
  rot:    { emoji: "🟥", label: "Rot"  },
};

export function parseCommand(input, currentMinute = 0) {
  const trimmed = (input ?? "").trim();

  if (!trimmed.startsWith("/")) {
    return { type: "invalid", formatted: trimmed, warnings: [], isValid: false, meta: {} };
  }

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  const cmdToken = tokens[0]?.toLowerCase();

  // ── Phasen-Commands ───────────────────────────────────────
  const phasedef = PHASE_CMDS[cmdToken];
  if (phasedef) {
    const minuteArg = tokens[1] ? parseInt(tokens[1], 10) : null;
    const minute = phasedef.hasMinute ? (minuteArg || currentMinute || null) : null;
    const warnings = phasedef.hasMinute && !minute ? ["Minute angeben: z.B. /anpfiff 45"] : [];
    return {
      type: "phase",
      formatted: phasedef.text,
      warnings,
      isValid: !phasedef.hasMinute || !!minute,
      meta: { icon: phasedef.icon, phase: phasedef.phase, minute },
    };
  }

  // ── Event-Commands ────────────────────────────────────────
  const commandType = CMD_MAP[cmdToken];
  if (!commandType) {
    return {
      type: "invalid",
      formatted: trimmed,
      warnings: [`Unbekannter Command: ${cmdToken}`],
      isValid: false,
      meta: {},
    };
  }

  const args = tokens.slice(1);

  switch (commandType) {
    case "goal": {
      const player = args[0];
      const team = args[1];
      const warnings = [];
      if (!player) warnings.push("Fehlend: Spieler");
      if (!team) warnings.push("Fehlend: Team");
      return {
        type: "goal",
        formatted: `TOR — ${player ?? "[SPIELER]"} (${team ?? "[TEAM]"})`,
        warnings,
        isValid: !!(player && team),
        meta: { icon: "⚽", phase: null, minute: currentMinute || null },
      };
    }

    case "card": {
      const colorArg = args.find((a) => CARD_COLORS[a.toLowerCase()]);
      const cardColor = colorArg ? CARD_COLORS[colorArg.toLowerCase()] : CARD_COLORS.yellow;
      const remaining = args.filter((a) => a.toLowerCase() !== colorArg?.toLowerCase());
      const player = remaining[0];
      const team = remaining[1];
      const warnings = [];
      if (!player) warnings.push("Fehlend: Spieler");
      if (!team) warnings.push("Fehlend: Team");
      return {
        type: "card",
        formatted: `${cardColor.label} — ${player ?? "[SPIELER]"} (${team ?? "[TEAM]"})`,
        warnings,
        isValid: !!(player && team),
        meta: { icon: cardColor.emoji, phase: null, minute: currentMinute || null },
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
        formatted: `Wechsel — ${playerIn ?? "[EIN]"} ↔ ${playerOut ?? "[AUS]"} (${team ?? "[TEAM]"})`,
        warnings,
        isValid: !!(playerIn && playerOut && team),
        meta: { icon: "🔄", phase: null, minute: currentMinute || null },
      };
    }

    case "note": {
      const noteText = args.join(" ");
      const warnings = noteText ? [] : ["Fehlend: Text"];
      return {
        type: "note",
        formatted: noteText || "[TEXT]",
        warnings,
        isValid: !!noteText,
        meta: { icon: "📝", phase: null, minute: currentMinute || null },
      };
    }

    case "card_yellow": {
      const player = args[0];
      const team = args[1];
      const warnings = [];
      if (!player) warnings.push("Fehlend: Spieler");
      if (!team) warnings.push("Fehlend: Team");
      return {
        type: "card",
        formatted: `Gelb — ${player ?? "[SPIELER]"} (${team ?? "[TEAM]"})`,
        warnings,
        isValid: !!(player && team),
        meta: { icon: "🟨", phase: null, minute: currentMinute || null },
      };
    }

    case "card_red": {
      const player = args[0];
      const team = args[1];
      const warnings = [];
      if (!player) warnings.push("Fehlend: Spieler");
      if (!team) warnings.push("Fehlend: Team");
      return {
        type: "card",
        formatted: `Rote Karte — ${player ?? "[SPIELER]"} (${team ?? "[TEAM]"})`,
        warnings,
        isValid: !!(player && team),
        meta: { icon: "🟥", phase: null, minute: currentMinute || null },
      };
    }

    case "own_goal": {
      const player = args[0];
      const team = args[1];
      const warnings = [];
      if (!player) warnings.push("Fehlend: Spieler");
      if (!team) warnings.push("Fehlend: Team");
      return {
        type: "own_goal",
        formatted: `Eigentor — ${player ?? "[SPIELER]"} (${team ?? "[TEAM]"})`,
        warnings,
        isValid: !!(player && team),
        meta: { icon: "⚽", phase: null, minute: currentMinute || null },
      };
    }

    case "missed_penalty": {
      const player = args[0];
      const team = args[1];
      const warnings = [];
      if (!player) warnings.push("Fehlend: Spieler");
      if (!team) warnings.push("Fehlend: Team");
      return {
        type: "missed_penalty",
        formatted: `Elfmeter verschossen — ${player ?? "[SPIELER]"} (${team ?? "[TEAM]"})`,
        warnings,
        isValid: !!(player && team),
        meta: { icon: "❌", phase: null, minute: currentMinute || null },
      };
    }

    default:
      return { type: "invalid", formatted: trimmed, warnings: ["Ungültiger Command"], isValid: false, meta: {} };
  }
}

/**
 * Hilfsfunktion: Gibt Icon + CSS-Klasse für einen Event-Typ zurück.
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
  if (eventType === "Goal") return { icon: "⚽", cssClass: "goal" };
  if (eventType === "Card") return { icon: detail?.toLowerCase().includes("red") ? "🟥" : "🟨", cssClass: "card" };
  if (eventType === "subst") return { icon: "🔄", cssClass: "sub" };
  return { icon: "•", cssClass: "" };
}

/**
 * Hilfsfunktion: Rohtext für ein Event (ohne AI-Text).
 */
export function getRawEventText(event) {
  const eventType = event.liveTickerEventType || event.type;
  const t = eventType?.toLowerCase();
  let desc: any = {};
  try { if (event.description) desc = JSON.parse(event.description); } catch {}
  const player = desc.player_name || event.player_name || "";
  const assist = desc.assist_name || event.assist_name || "";
  const detail = desc.detail || event.detail || "";

  if (t === "goal") return `Tor! ${player}${assist ? ` (Assist: ${assist})` : ""}`;
  if (t === "own_goal") return `Eigentor! ${player}`;
  if (t === "missed_penalty") return `Elfmeter verschossen — ${player}`;
  if (t === "yellow_card") return `Gelb — ${player}`;
  if (t === "red_card") return `Rot — ${player}`;
  if (t === "substitution") return `↑ ${assist}${player ? ` / ↓ ${player}` : ""}`;
  if (t === "kick_off") return "Anstoß";
  if (t === "halftime") return "Halbzeit";
  if (t === "fulltime") return "Abpfiff";
  if (eventType === "Goal") return `Tor! ${player}${assist ? ` (Assist: ${assist})` : ""}`;
  if (eventType === "Card") return `${detail} — ${player}`;
  if (eventType === "subst") return `↑ ${assist}${player ? ` / ↓ ${player}` : ""}`;
  return detail;
}

/**
 * Hilfsfunktion: Match-Status normalisieren.
 */
export function normalizeMatchStatus(status) {
  const LIVE = ["1H", "2H", "HT", "ET", "live", "Live"];
  const FINISHED = ["FT", "AET", "PEN", "finished", "FullTime"];
  if (LIVE.includes(status)) return "live";
  if (FINISHED.includes(status)) return "finished";
  return "scheduled";
}
