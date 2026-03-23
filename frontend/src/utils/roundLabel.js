const KNOCKOUT_LABELS_SHORT = { 64: "1/64", 32: "1/32", 16: "1/16", 8: "VF", 4: "HF", 2: "FIN", 1: "FIN" };
const KNOCKOUT_LABELS_FULL  = { 64: "1/64-Finale", 32: "1/32-Finale", 16: "Achtelfinale", 8: "Viertelfinale", 4: "Halbfinale", 2: "Finale", 1: "Finale" };

export function knockoutThreshold(allRounds) {
  const sorted = [...allRounds].sort((a, b) => a - b);
  let n = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i] === i + 1) n++;
    else break;
  }
  return n;
}

export function makeRoundLabel(allRounds) {
  const threshold = knockoutThreshold(allRounds);
  return {
    short: (r) => {
      const n = parseInt(r);
      if (n <= threshold) return String(n);
      return KNOCKOUT_LABELS_SHORT[n] ?? `R${n}`;
    },
    full: (r) => {
      const n = parseInt(r);
      if (n <= threshold) return `Spieltag ${n}`;
      return KNOCKOUT_LABELS_FULL[n] ?? `Runde der letzten ${n}`;
    },
  };
}
