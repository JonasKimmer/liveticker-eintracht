const KNOCKOUT_LABELS_SHORT = { 64: "1/64", 32: "1/32", 16: "1/16", 8: "VF", 4: "HF", 2: "FIN", 1: "FIN" };
const KNOCKOUT_LABELS_FULL  = { 64: "1/64-Finale", 32: "1/32-Finale", 16: "Achtelfinale", 8: "Viertelfinale", 4: "Halbfinale", 2: "Finale", 1: "Finale" };

/**
 * Gibt die Anzahl aufeinanderfolgender Gruppenspielrunden zurück (beginnend bei 1).
 * Beispiel: [1,2,3,5] → 3 (Lücke bei 4 stoppt die Zählung)
 *
 * @param {number[]} allRounds - Alle verfügbaren Rundennummern des Wettbewerbs
 * @returns {number} Anzahl der Gruppenspielrunden (0 wenn keine ab Runde 1)
 */
export function knockoutThreshold(allRounds: number[]): number {
  const sorted = [...allRounds].sort((a, b) => a - b);
  let n = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i] === i + 1) n++;
    else break;
  }
  return n;
}

/**
 * Erzeugt Label-Funktionen für Rundennummern eines Wettbewerbs.
 * Runden bis zum Knockout-Threshold werden als Spieltag bezeichnet,
 * darüber hinaus nach KO-Rundenbezeichnungen (Halbfinale, Finale…).
 *
 * @param {number[]} allRounds - Alle verfügbaren Rundennummern des Wettbewerbs
 * @returns {{ short: (r: number) => string, full: (r: number) => string }}
 */
export function makeRoundLabel(allRounds: number[]): { short: (r: number | string) => string; full: (r: number | string) => string } {
  const threshold = knockoutThreshold(allRounds);
  return {
    short: (r) => {
      const n = parseInt(String(r), 10);
      if (n <= threshold) return String(n);
      return KNOCKOUT_LABELS_SHORT[n] ?? `R${n}`;
    },
    full: (r) => {
      const n = parseInt(String(r), 10);
      if (n <= threshold) return `Spieltag ${n}`;
      return KNOCKOUT_LABELS_FULL[n] ?? `Runde der letzten ${n}`;
    },
  };
}
