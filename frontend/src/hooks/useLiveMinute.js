import { useState, useEffect } from "react";
import { normalizeMatchStatus } from "../components/LiveTicker/utils/parseCommand";
import { MATCH_PHASES } from "../components/LiveTicker/utils/constants";

/**
 * Berechnet die aktuelle Spielminute basierend auf Matchstatus und Anstoßzeit.
 * Aktualisiert sich alle 30 Sekunden während eines Live-Spiels.
 *
 * @param {object|null} match - Match-Objekt aus der API
 * @returns {number} Aktuelle Spielminute (0 wenn kein Live-Spiel)
 */
export function useLiveMinute(match) {
  const [now, setNow] = useState(Date.now());
  const status = normalizeMatchStatus(match?.matchState);

  useEffect(() => {
    if (status !== "live") return;
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, [status]);

  if (!match || status !== "live") return 0;

  // DB minute takes priority
  if (match.minute != null) return match.minute;

  // Compute from kickoff or startsAt
  const kickoffTime = match.kickoff || match.startsAt;
  if (!kickoffTime) return 0;

  const kickoffMs = new Date(kickoffTime).getTime();
  if (isNaN(kickoffMs)) return 0;

  const elapsedMin = Math.floor((now - kickoffMs) / 60000);
  if (elapsedMin < 0) return 0;

  if (match.matchPhase === MATCH_PHASES.SECOND_HALF) {
    // elapsed ~60 min = start of 2nd half (45' + ~15' break)
    return Math.max(elapsedMin - 60 + 46, 46);
  }
  // FirstHalf
  return Math.max(elapsedMin, 1);
}
