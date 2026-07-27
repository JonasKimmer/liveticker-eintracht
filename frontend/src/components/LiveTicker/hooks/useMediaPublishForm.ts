/**
 * useMediaPublishForm
 * ===================
 * Shared publish-form state and submit logic for the social-media panels
 * (Twitter, Instagram, YouTube). Each panel has an identical modal: minute
 * input, phase selector, loading/error state, and the same publishClip call.
 */
import { useState } from "react";
import { publishClip } from "api";
import { resolvePublishPayload } from "../utils/publishPayload";
import type { MatchPhase } from "../../../types";

/**
 * @param {number|null} currentMinute - Live match minute to pre-fill
 * @returns {{
 *   minute: number, setMinute: Function,
 *   phase: string,  setPhase: Function,
 *   loading: boolean,
 *   error: string|null, setError: Function,
 *   submit: (itemId: number, matchId: number, text: string, onPublished: Function) => Promise<void>
 * }}
 */
export function useMediaPublishForm(currentMinute: number) {
  const [minute, setMinute] = useState(currentMinute ?? 0);
  const [phase, setPhase] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(
    itemId: number | string,
    matchId: number,
    text: string,
    onPublished: (id: number | string) => void,
  ) {
    if (!text.trim()) {
      setError("Text darf nicht leer sein.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const publishMinute =
        phase === "Halftime" ? 45 : phase ? null : minute || null;
      const { text: publishText, icon } = resolvePublishPayload(
        text,
        publishMinute,
      );
      await publishClip(
        Number(itemId),
        matchId,
        publishText,
        publishMinute,
        (phase || null) as MatchPhase | null,
        icon,
      );
      onPublished(itemId);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(
        typeof detail === "string"
          ? detail
          : detail
            ? JSON.stringify(detail)
            : (err.message ?? "Fehler"),
      );
      setLoading(false);
    }
  }

  return {
    minute,
    setMinute,
    phase,
    setPhase,
    loading,
    error,
    setError,
    submit,
  };
}
