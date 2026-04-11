/**
 * useMatchTriggers
 * ================
 * Kapselt alle fire-and-forget n8n-Webhook-Trigger und Auto-Import-Effekte,
 * die beim Öffnen eines Matches oder bei Spielstandsänderungen ausgelöst werden.
 * Dadurch bleibt LiveTicker.jsx fokussiert auf UI-Logik.
 *
 * @param {object} params
 * @param {number|null} params.selMatchId - Aktuell ausgewählte Match-ID.
 * @param {object|null} params.match - Match-Objekt mit externalId und matchPhase.
 * @param {object[]} params.events - Liste der Spielereignisse.
 * @param {object[]} params.lineups - Aufstellungsdaten.
 * @param {object[]} params.matchStats - Spielstatistiken.
 * @param {object[]} params.tickerTexts - Bestehende Ticker-Einträge.
 * @param {string} params.instance - LLM-Instanz ("generic" | "ef_whitelabel").
 * @param {string} params.language - Sprache für LLM-Texte (z.B. "de", "en").
 * @param {() => void} params.reload - Callback zum Neu-Laden der Spieldaten.
 */
import { useEffect, useRef } from "react";
import * as api from "api";
import logger from "utils/logger";
import { MATCH_PHASES } from "../constants";
import type {
  Match,
  MatchEvent,
  TickerEntry,
  ReloadFunctions,
  LineupEntry,
  MatchStat,
} from "../../../types";

const PHASE_TO_STATUS: Record<string, string> = {
  [MATCH_PHASES.FIRST_HALF]: "1H",
  [MATCH_PHASES.FIRST_HALF_BREAK]: "HT",
  [MATCH_PHASES.SECOND_HALF]: "2H",
  [MATCH_PHASES.EXTRA_FIRST_HALF]: "ET",
  [MATCH_PHASES.EXTRA_BREAK]: "BT",
  [MATCH_PHASES.EXTRA_SECOND_HALF]: "ET",
  [MATCH_PHASES.EXTRA_SECOND_HALF_BREAK]: "BT",
  [MATCH_PHASES.PENALTY_SHOOTOUT]: "P",
};

export function useMatchTriggers({
  selMatchId,
  match,
  events,
  lineups,
  matchStats,
  tickerTexts,
  tickerTextsLoaded,
  instance,
  style = "neutral",
  language = "de",
  tickerMode = "coop",
  reload,
}: {
  selMatchId: number | null;
  match: Match | null;
  events: MatchEvent[];
  lineups: LineupEntry[];
  matchStats: MatchStat[];
  tickerTexts: TickerEntry[];
  tickerTextsLoaded: boolean;
  instance: string;
  style?: string;
  language?: string;
  tickerMode?: string;
  reload: ReloadFunctions & {
    loadPrematch?: () => void;
    loadLineups?: () => void;
    loadMatchStats?: () => void;
    loadPlayerStats?: () => void;
  };
}) {
  // Reload-Delays nach n8n-Trigger: LLM kann 5–30s brauchen, daher gestaffelte Reloads.
  // Anchor-Reloads starten sofort nach dem Trigger-Aufruf.
  const POST_MATCH_RELOAD_DELAYS_MS = [
    10000, 20000, 35000, 55000, 80000, 110000,
  ];
  // Post-LLM-Reloads starten nach Antwort des n8n-Webhooks (sequenzielle Generierung).
  const POST_LLM_RELOAD_DELAYS_MS = [4000, 9000, 16000, 24000, 35000];

  // Hält die aktuell aktive Match-ID für Timeout-Guards (Flash-Bug-Fix).
  // Timeouts prüfen vor Ausführung ob noch dasselbe Spiel aktiv ist —
  // verhindert stale-Closures ohne Cleanup/Cancel der Timeouts.
  const currentMatchIdRef = useRef<number | null>(null);
  currentMatchIdRef.current = selMatchId;

  // ── Match-Summary via n8n (Halbzeit / Abpfiff) ────────────
  const summaryTriggeredRef = useRef(new Set());
  useEffect(() => {
    if (!selMatchId || !match || !tickerTextsLoaded) return;
    if (match.id !== selMatchId) return; // stale match aus vorherigem Spiel

    const isSecondHalfOrLater = [
      MATCH_PHASES.SECOND_HALF,
      MATCH_PHASES.EXTRA_FIRST_HALF,
      MATCH_PHASES.EXTRA_BREAK,
      MATCH_PHASES.EXTRA_SECOND_HALF,
      MATCH_PHASES.PENALTY_SHOOTOUT,
    ].includes(match.matchPhase ?? "");
    const isFullTime = match.matchState === MATCH_PHASES.FULL_TIME;

    const hasHalftimeSummary = tickerTexts.some(
      (t) =>
        (t.phase === "Halftime" || t.phase === MATCH_PHASES.FIRST_HALF_BREAK) &&
        !t.synthetic_event_id &&
        t.status !== "deleted",
    );
    const hasAfterSummary = tickerTexts.some(
      (t) =>
        (t.phase === MATCH_PHASES.AFTER || t.phase === "FullTime") &&
        !t.synthetic_event_id &&
        t.status !== "deleted",
    );

    const phasesToCheck: string[] = [];
    if ((isSecondHalfOrLater || isFullTime) && !hasHalftimeSummary) {
      phasesToCheck.push(MATCH_PHASES.FIRST_HALF_BREAK);
    }
    if (isFullTime && !hasAfterSummary) {
      phasesToCheck.push(MATCH_PHASES.AFTER);
    }
    if (phasesToCheck.length === 0) return;

    for (const phase of phasesToCheck) {
      const key = `${selMatchId}-${phase}`;
      if (summaryTriggeredRef.current.has(key)) continue;
      summaryTriggeredRef.current.add(key);
      api
        .generateMatchSummary(
          selMatchId,
          phase,
          style,
          instance,
          language,
          tickerMode,
        )
        .catch((err) =>
          logger.warn(
            "[useMatchTriggers] generateMatchSummary silenced:",
            err?.message,
          ),
        );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selMatchId,
    match?.matchPhase,
    match?.matchState,
    tickerTexts,
    tickerTextsLoaded,
  ]);

  // ── Minuten-Update + Events (jede Minute bei laufendem Spiel) ─────
  useEffect(() => {
    if (!selMatchId || !match?.externalId || match.matchState !== "Live")
      return;
    const callMinute = () => {
      api
        .syncMatchLive(match.id)
        .then(() => reload.loadMatch?.())
        .catch((err) =>
          logger.warn(
            "[useMatchTriggers] syncMatchLive silenced:",
            err?.message,
          ),
        );
      api
        .triggerMinuteUpdate(match.externalId!)
        .catch((err) =>
          logger.warn(
            "[useMatchTriggers] triggerMinuteUpdate silenced:",
            err?.message,
          ),
        );
    };
    const callEvents = () =>
      api
        .importEvents(match.externalId!, tickerMode)
        .catch((err) =>
          logger.warn(
            "[useMatchTriggers] importEvents silenced:",
            err?.message,
          ),
        );
    const callStats = () =>
      api
        .importMatchStats(selMatchId)
        .catch((err) =>
          logger.warn(
            "[useMatchTriggers] importMatchStats silenced:",
            err?.message,
          ),
        );
    const callPlayerStats = () =>
      api
        .importPlayerStatistics(selMatchId)
        .catch((err) =>
          logger.warn(
            "[useMatchTriggers] importPlayerStatistics silenced:",
            err?.message,
          ),
        );
    callMinute();
    callEvents();
    callStats();
    callPlayerStats();
    const interval = setInterval(() => {
      callMinute();
      callEvents();
      callStats();
      callPlayerStats();
    }, 60 * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selMatchId, match?.externalId, match?.matchState]);

  // ── Live Stats Monitor (alle 5 Min bei laufendem Spiel) ───
  useEffect(() => {
    if (!selMatchId || !match?.matchState) return;
    if (match.matchState === "PreMatch") return;
    api
      .triggerLiveStatsMonitor(selMatchId, instance, language)
      .catch((err) =>
        logger.warn(
          "[useMatchTriggers] triggerLiveStatsMonitor silenced:",
          err?.message,
        ),
      );
    if (match.matchState !== "Live") return;
    const interval = setInterval(
      () => {
        api
          .triggerLiveStatsMonitor(selMatchId, instance, language)
          .catch((err) =>
            logger.warn(
              "[useMatchTriggers] triggerLiveStatsMonitor silenced:",
              err?.message,
            ),
          );
      },
      5 * 60 * 1000,
    );
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selMatchId, match?.matchState, instance, language]);

  // ── Match-Status Webhook beim Match-Open ──────────────────
  // Guard-Key = matchId + status: jede Phase darf einmal triggern.
  // Kein Guard bei PreMatch (status = null) damit Anpfiff später noch feuert.
  const matchStatusTriggeredRef = useRef(new Set());
  useEffect(() => {
    if (!selMatchId || !match?.matchState || !match?.externalId) return;
    if (!tickerTextsLoaded) return; // warten bis erste Fetch-Runde durch ist
    if (match.id !== selMatchId) return; // stale match aus vorherigem Spiel

    let status = null;
    if (match.matchState === MATCH_PHASES.FULL_TIME) {
      status = "FT";
    } else if (match.matchState === "Live") {
      status = PHASE_TO_STATUS[match.matchPhase] ?? "1H";
    }

    if (!status) return; // PreMatch o.ä. — kein Guard setzen, kein Call

    const key = `${selMatchId}-${status}`;
    if (matchStatusTriggeredRef.current.has(key)) return;
    matchStatusTriggeredRef.current.add(key);

    // Nicht triggern wenn für diese Phase bereits ein Eintrag existiert
    // (published, draft oder deleted) — deleted-Einträge kommen via all_entries=true
    // zurück und sind im UI unsichtbar, verhindern aber das Respawnen.
    const phasesForStatus: Record<string, string[]> = {
      "1H": ["FirstHalf"],
      HT: ["FirstHalfBreak"],
      "2H": ["SecondHalf"],
      FT: ["FullTime", "After"],
      ET: ["ExtraFirstHalf", "ExtraSecondHalf"],
    };
    const relevantPhases = phasesForStatus[status] ?? [];
    const alreadyHandled = relevantPhases.some((phase) =>
      tickerTexts.some(
        (t) =>
          t.match_id === selMatchId &&
          t.phase === phase &&
          (t.status === "published" ||
            t.status === "draft" ||
            t.status === "deleted"),
      ),
    );
    if (alreadyHandled) return;

    // Beim Öffnen eines laufenden Spiels in der 2. HZ oder später:
    // generate-match-phases füllt fehlende Phasen mit korrekten Default-Minuten (1/45/46/90)
    if (status === "2H" || status === "FT") {
      api
        .generateMatchPhases(selMatchId, style, instance, language, tickerMode === "auto")
        .then(() => reload.loadTickerTexts())
        .catch((err) =>
          logger.warn(
            "[useMatchTriggers] generateMatchPhases silenced:",
            err?.message,
          ),
        );
    }

    // Anchor-Reloads ab jetzt — unabhängig vom API-Timing (n8n kann busy sein)
    const scheduledFor = selMatchId;
    POST_MATCH_RELOAD_DELAYS_MS.forEach((delay) => {
      setTimeout(() => {
        if (currentMatchIdRef.current === scheduledFor)
          reload.loadTickerTexts();
      }, delay);
    });

    api
      .triggerMatchStatus(
        match.externalId,
        status,
        match.minute ?? null,
        instance,
        language,
        style,
        tickerMode,
      )
      .then(() => {
        // Zusätzliche Reloads nach API-Antwort (LLM sequenziell je ~5s)
        POST_LLM_RELOAD_DELAYS_MS.forEach((delay) => {
          setTimeout(() => {
            if (currentMatchIdRef.current === scheduledFor)
              reload.loadTickerTexts();
          }, delay);
        });
      })
      .catch((err) =>
        logger.warn(
          "[useMatchTriggers] triggerMatchStatus silenced:",
          err?.message,
        ),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selMatchId,
    match?.matchState,
    match?.matchPhase,
    tickerTexts,
    tickerTextsLoaded,
  ]);

  // ── Auto-Import: Events ───────────────────────────────────
  useEffect(() => {
    if (!selMatchId || !match?.externalId || events.length > 0) return;
    api
      .importEvents(match.externalId, tickerMode)
      .then(() => reload.loadEvents())
      .catch((err) =>
        logger.error("[useMatchTriggers] importEvents error:", err),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selMatchId, match?.externalId, events.length]);

  // ── Auto-Import: Lineups ──────────────────────────────────
  useEffect(() => {
    if (!selMatchId || lineups.length > 0) return;
    api
      .importLineups(selMatchId)
      .then(() => reload.loadLineups())
      .catch((err) =>
        logger.error("[useMatchTriggers] importLineups error:", err),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selMatchId, lineups.length]);

  // ── Auto-Import: Match-Statistiken ───────────────────────
  useEffect(() => {
    if (!selMatchId || matchStats.length > 0) return;
    api
      .importMatchStats(selMatchId)
      .then(() => reload.loadMatchStats())
      .catch((err) =>
        logger.error("[useMatchTriggers] importMatchStats error:", err),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selMatchId, matchStats.length]);

  // ── Auto-Import: Prematch + Synthetic Batch ───────────────
  const prematchImportedRef = useRef(new Set());
  useEffect(() => {
    if (!selMatchId || !match?.externalId) return;
    if (match.id !== selMatchId) return; // stale match aus vorherigem Spiel
    if (prematchImportedRef.current.has(selMatchId)) return;
    prematchImportedRef.current.add(selMatchId);

    // Anchor-Reloads ab jetzt — unabhängig vom API-Timing (n8n kann busy sein)
    const scheduledFor = selMatchId;
    POST_MATCH_RELOAD_DELAYS_MS.forEach((delay) => {
      setTimeout(() => {
        if (currentMatchIdRef.current === scheduledFor)
          reload.loadTickerTexts();
      }, delay);
    });

    api
      .importPrematch(match.externalId, tickerMode)
      .then(() => reload.loadPrematch())
      .then(() =>
        api
          .generateSyntheticBatch(
            selMatchId,
            style,
            instance,
            language,
            tickerMode,
          )
          .then(() => {
            // Zusätzliche Reloads nach API-Antwort
            [3000, 8000, 15000, 25000].forEach((delay) => {
              setTimeout(() => {
                if (currentMatchIdRef.current === scheduledFor)
                  reload.loadTickerTexts();
              }, delay);
            });
          })
          .catch((err) =>
            logger.error(
              "[useMatchTriggers] generateSyntheticBatch error:",
              err,
            ),
          ),
      )
      .catch((err) =>
        logger.error("[useMatchTriggers] importPrematch error:", err),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selMatchId, match?.externalId]);

  // ── Auto-Import: Spieler-Statistiken ─────────────────────
  const playerStatsImportedRef = useRef(null);
  useEffect(() => {
    if (!selMatchId) return;
    if (playerStatsImportedRef.current === selMatchId) return;
    playerStatsImportedRef.current = selMatchId;
    api
      .importPlayerStatistics(selMatchId)
      .then(() => reload.loadPlayerStats())
      .catch((err) =>
        logger.error("[useMatchTriggers] importPlayerStatistics error:", err),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selMatchId]);
}
