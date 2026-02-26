import { useState, useEffect, useRef } from "react";
import * as api from "../api";

/**
 * Lädt Matchdays für ein Team + Competition.
 * - Sofortiger Fetch (triggert Backend-Webhook einmalig)
 * - Ein verzögerter Refresh nach 25s (holt neue Daten nach Import)
 */
export function usePollingMatchdays(teamId, competitionId) {
  const [matchdays, setMatchdays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (!teamId || !competitionId) {
      setMatchdays([]);
      return;
    }

    setMatchdays([]);
    setError(null);
    setLoading(true);
    clearTimeout(timeoutRef.current);

    const fetch = async () => {
      try {
        const res = await api.fetchTeamMatchdays(teamId, competitionId);
        return res.data;
      } catch {
        setError("Fehler beim Laden der Spieltage.");
        return null;
      }
    };

    // Initialer Fetch — triggert Backend-Webhook
    fetch().then((data) => {
      if (data) setMatchdays(data);
      setLoading(false);
    });

    // Einmaliger Refresh nach 25s — holt importierte Daten
    timeoutRef.current = setTimeout(async () => {
      const data = await fetch();
      if (data && data.length > 0) setMatchdays(data);
    }, 25000);

    return () => clearTimeout(timeoutRef.current);
  }, [teamId, competitionId]);

  return { matchdays, loading, error };
}
