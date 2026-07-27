import { useState, useEffect, useRef } from "react";
import * as api from "api";

/**
 * Lädt Matchdays für ein Team + Competition.
 * - Sofortiger Fetch (triggert Backend-Webhook einmalig)
 * - Retry alle 4s bis die Daten stabil sind (max. 6 Versuche ≈ 20s)
 *   → Verhindert, dass der Nutzer zurück-und-vor wechseln muss wenn
 *     der Match-Import noch nicht abgeschlossen ist.
 *
 * @param {number|null} teamId - Interne Team-ID.
 * @param {number|null} competitionId - Interne Competition-ID.
 * @returns {{ matchdays: number[], loading: boolean, error: string|null }}
 */

const MAX_RETRIES = 6;
const RETRY_INTERVAL_MS = 4000;

export function usePollingMatchdays(
  teamId: number | null,
  competitionId: number | null,
) {
  const [matchdays, setMatchdays] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!teamId || !competitionId) {
      setMatchdays([]);
      return;
    }

    setMatchdays([]);
    setError(null);
    setLoading(true);
    clearTimeout(timerRef.current);

    let attempt = 0;
    let lastCount = -1;

    const fetchAndSchedule = async () => {
      attempt++;
      try {
        const res = await api.fetchTeamMatchdays(teamId, competitionId);
        const data: number[] = res.data;
        setMatchdays(data);

        // Stop early if count has stabilized (same non-zero count twice in a row)
        if (data.length > 0 && data.length === lastCount) return;
        lastCount = data.length;
      } catch {
        setError("Fehler beim Laden der Spieltage.");
      } finally {
        if (attempt === 1) setLoading(false);
      }

      if (attempt < MAX_RETRIES) {
        timerRef.current = setTimeout(fetchAndSchedule, RETRY_INTERVAL_MS);
      }
    };

    fetchAndSchedule();
    return () => clearTimeout(timerRef.current);
  }, [teamId, competitionId]);

  return { matchdays, loading, error };
}
