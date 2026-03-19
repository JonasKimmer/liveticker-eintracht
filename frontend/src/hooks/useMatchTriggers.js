/**
 * useMatchTriggers
 * ================
 * Kapselt alle fire-and-forget n8n-Webhook-Trigger und Auto-Import-Effekte,
 * die beim Öffnen eines Matches oder bei Spielstandsänderungen ausgelöst werden.
 * Dadurch bleibt LiveTicker.jsx fokussiert auf UI-Logik.
 */
import { useEffect, useRef } from "react";
import * as api from "../api";

const PHASE_TO_STATUS = {
  FirstHalf:            "1H",
  FirstHalfBreak:       "HT",
  SecondHalf:           "2H",
  ExtraFirstHalf:       "ET",
  ExtraBreak:           "BT",
  ExtraSecondHalf:      "ET",
  ExtraSecondHalfBreak: "BT",
  PenaltyShootout:      "P",
};

export function useMatchTriggers({
  selMatchId,
  match,
  events,
  lineups,
  matchStats,
  tickerTexts,
  instance,
  reload,
}) {
  // ── Match-Summary via n8n (Halbzeit / Abpfiff) ────────────
  const summaryTriggeredRef = useRef(new Set());
  useEffect(() => {
    if (!selMatchId || !match || !tickerTexts) return;

    const phasesToCheck = [];
    if (match.matchPhase === "FirstHalfBreak" || match.matchState === "FullTime") {
      phasesToCheck.push("FirstHalfBreak");
    }
    if (match.matchState === "FullTime") {
      phasesToCheck.push("After");
    }
    if (phasesToCheck.length === 0) return;

    for (const phase of phasesToCheck) {
      const key = `${selMatchId}-${phase}`;
      if (summaryTriggeredRef.current.has(key)) continue;
      summaryTriggeredRef.current.add(key);
      const exists = tickerTexts.some(
        (t) => t.phase === phase && (t.status === "published" || t.status == null),
      );
      if (!exists) {
        api.generateMatchSummary(selMatchId, phase).catch((err) =>
          console.warn("[useMatchTriggers] generateMatchSummary silenced:", err?.message)
        );
      }
    }
  }, [selMatchId, match?.matchPhase, match?.matchState, tickerTexts]);

  // ── Live Stats Monitor (alle 5 Min bei laufendem Spiel) ───
  useEffect(() => {
    if (!selMatchId || !match?.matchState) return;
    if (match.matchState === "PreMatch") return;
    api.triggerLiveStatsMonitor(selMatchId).catch((err) =>
      console.warn("[useMatchTriggers] triggerLiveStatsMonitor silenced:", err?.message)
    );
    if (match.matchState !== "Live") return;
    const interval = setInterval(() => {
      api.triggerLiveStatsMonitor(selMatchId).catch((err) =>
        console.warn("[useMatchTriggers] triggerLiveStatsMonitor silenced:", err?.message)
      );
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [selMatchId, match?.matchState]);

  // ── Match-Status Webhook beim Match-Open ──────────────────
  const matchStatusTriggeredRef = useRef(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!selMatchId || !match?.matchState || !match?.externalId) return;
    if (matchStatusTriggeredRef.current === selMatchId) return;
    matchStatusTriggeredRef.current = selMatchId;

    let status = null;
    if (match.matchState === "FullTime") {
      status = "FT";
    } else if (match.matchState === "Live") {
      status = PHASE_TO_STATUS[match.matchPhase] ?? "1H";
    }

    if (status) {
      api
        .triggerMatchStatus(match.externalId, status, match.minute ?? null)
        .catch((err) =>
          console.warn("[useMatchTriggers] triggerMatchStatus silenced:", err?.message)
        );
    }
  }, [selMatchId, match?.matchState, match?.matchPhase]);

  // ── Auto-Import: Events ───────────────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!selMatchId || !match?.externalId || events.length > 0) return;
    api
      .importEvents(match.externalId)
      .then(() => reload.loadEvents())
      .catch((err) => console.error("[useMatchTriggers] importEvents error:", err));
  }, [selMatchId, match?.externalId, events.length]);

  // ── Auto-Import: Lineups ──────────────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!selMatchId || lineups.length > 0) return;
    api
      .importLineups(selMatchId)
      .then(() => reload.loadLineups())
      .catch((err) => console.error("[useMatchTriggers] importLineups error:", err));
  }, [selMatchId, lineups.length]);

  // ── Auto-Import: Match-Statistiken ───────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!selMatchId || matchStats.length > 0) return;
    api
      .importMatchStats(selMatchId)
      .then(() => reload.loadMatchStats())
      .catch((err) => console.error("[useMatchTriggers] importMatchStats error:", err));
  }, [selMatchId, matchStats.length]);

  // ── Auto-Import: Prematch + Synthetic Batch ───────────────
  const prematchImportedRef = useRef(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!selMatchId || !match?.externalId) return;
    if (prematchImportedRef.current === selMatchId) return;
    prematchImportedRef.current = selMatchId;
    api
      .importPrematch(match.externalId)
      .then(() => reload.loadPrematch())
      .then(() =>
        api
          .generateSyntheticBatch(selMatchId, "neutral", instance)
          .then(() => {
            // LLM läuft async — mehrfach nachladen
            [3000, 8000, 15000, 25000, 40000].forEach((delay) => {
              setTimeout(() => reload.loadTickerTexts(), delay);
            });
          })
          .catch((err) => console.error("[useMatchTriggers] generateSyntheticBatch error:", err)),
      )
      .catch((err) => console.error("[useMatchTriggers] importPrematch error:", err));
  }, [selMatchId, match?.externalId]);

  // ── Auto-Import: Spieler-Statistiken ─────────────────────
  const playerStatsImportedRef = useRef(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!selMatchId) return;
    if (playerStatsImportedRef.current === selMatchId) return;
    playerStatsImportedRef.current = selMatchId;
    api
      .importPlayerStatistics(selMatchId)
      .then(() => reload.loadPlayerStats())
      .catch((err) => console.error("[useMatchTriggers] importPlayerStatistics error:", err));
  }, [selMatchId]);
}
