import { useState, useEffect, useRef } from "react";
import * as api from "api";

/**
 * Lädt Matchdays für ein Team + Competition.
 * - Sofortiger Fetch (triggert Backend-Webhook einmalig)
 * - Ein verzögerter Refresh nach 25s (holt neue Daten nach Import)
 *
 * @param {number|null} teamId - Interne Team-ID.
 * @param {number|null} competitionId - Interne Competition-ID.
 * @returns {{ matchdays: object[], loading: boolean, error: Error|null }}
 */
export function usePollingMatchdays(
  teamId: number | null,
  competitionId: number | null,
) {
  const [matchdays, setMatchdays] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!teamId || !competitionId) {
      setMatchdays([]);
      return;
    }

    setMatchdays([]);
    setError(null);
    setLoading(true);
    clearTimeout(timeoutRef.current);

    const fetchMatchdays = async () => {
      try {
        const res = await api.fetchTeamMatchdays(teamId, competitionId);
        return res.data;
      } catch {
        setError("Fehler beim Laden der Spieltage.");
        return null;
      }
    };

    // Initialer Fetch — triggert Backend-Webhook
    fetchMatchdays().then((data) => {
      if (data) setMatchdays(data);
      setLoading(false);
    });

    // Einmaliger Refresh nach 25s — holt importierte Daten
    timeoutRef.current = setTimeout(async () => {
      const data = await fetchMatchdays();
      if (data && data.length > 0) setMatchdays(data);
    }, 25000);

    return () => clearTimeout(timeoutRef.current);
  }, [teamId, competitionId]);

  return { matchdays, loading, error };
}
