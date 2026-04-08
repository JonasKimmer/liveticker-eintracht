// ============================================================
// hooks/useTicker.js
// Alle Ticker-Actions, Drafts, Toasts und Modus-Verwaltung
// ============================================================
import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import * as api from "api";
import logger from "utils/logger";
import { useTickerMode } from "./useTickerMode";
import type {
  TickerMode,
  ReloadFunctions,
  TickerStyle,
  MatchPhase,
} from "../../../types";
import type { TickerModeContextValue } from "../../../context/TickerModeContext";

/**
 * Kapselt alle Ticker-Actions, Drafts, Toasts und Modus-Verwaltung.
 * Stellt TickerModeContext und TickerActionsContext bereit.
 *
 * @param {{ selMatchId: number|null, reload: object, instance: string, language: string }} params
 * @returns {{
 *   mode: string,
 *   handleModeChange: Function,
 *   tickerModeCtx: object,
 *   tickerActionsCtx: object,
 *   generatingId: number|null,
 *   publishToast: object|null,
 *   setPublishToast: Function,
 *   handleRetract: Function,
 *   deleteToast: object|null,
 * }}
 */
interface UseTickerParams {
  selMatchId: number | null;
  reload: ReloadFunctions;
  instance: string;
  language: string;
  matchTickerMode?: TickerMode;
  initialMode?: TickerMode;
}

export function useTicker({
  selMatchId,
  reload,
  instance,
  language,
  matchTickerMode,
  initialMode,
}: UseTickerParams) {
  // ── Aktiver Draft ─────────────────────────────────────────
  const [activeDraftId, setActiveDraftId] = useState<number | null>(null);
  const [activeDraftText, setActiveDraftText] = useState("");

  // ── Publish Toast (Undo) ───────────────────────────────────
  const [publishToast, setPublishToast] = useState<{
    id: number;
    text: string;
    isManual: boolean;
  } | null>(null);
  const [retractedText, setRetractedText] = useState<string | null>(null);
  const clearRetractedText = useCallback(() => setRetractedText(null), []);

  // ── Delete Toast ───────────────────────────────────────────
  const [deleteToast, setDeleteToast] = useState(false);
  const deleteToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const showPublishToast = useCallback(
    (id: number, text: string, isManual = false) => {
      setPublishToast({ id, text, isManual });
    },
    [],
  );

  const handleRetract = useCallback(async () => {
    if (!publishToast) return;
    try {
      await api.updateTicker(publishToast.id, { status: "draft" });
      await reload.loadTickerTexts();
      if (publishToast.isManual) setRetractedText(publishToast.text);
    } catch (err) {
      logger.error("retract error:", err);
    } finally {
      setPublishToast(null);
    }
  }, [publishToast, reload]);

  const acceptDraft = useCallback(async () => {
    if (!activeDraftId) return;
    try {
      await api.publishTicker(activeDraftId, activeDraftText);
      await reload.loadTickerTexts();
      showPublishToast(activeDraftId, activeDraftText);
      setActiveDraftId(null);
      setActiveDraftText("");
    } catch (err) {
      logger.error("acceptDraft error:", err);
    }
  }, [activeDraftId, activeDraftText, reload, showPublishToast]);

  const rejectDraft = useCallback(async () => {
    if (!activeDraftId) return;
    try {
      await api.updateTicker(activeDraftId, { status: "rejected" });
      await reload.loadTickerTexts();
      setActiveDraftId(null);
      setActiveDraftText("");
    } catch (err) {
      logger.error("rejectDraft error:", err);
    }
  }, [activeDraftId, reload]);

  const { mode, setMode } = useTickerMode(
    acceptDraft,
    rejectDraft,
    initialMode,
  );

  // Modus in DB speichern wenn gewechselt wird
  const handleModeChange = useCallback(
    async (newMode: TickerMode) => {
      setMode(newMode);
      if (selMatchId) {
        try {
          await api.setMatchTickerMode(selMatchId, newMode);
        } catch (_) {}
      }
    },
    [setMode, selMatchId],
  );

  // Modus aus DB lesen wenn Spiel geladen wird (match.tickerMode überschreibt Initial-State)
  const syncedMatchIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (!selMatchId || !matchTickerMode) return;
    if (syncedMatchIdRef.current === selMatchId) return; // bereits synchronisiert
    syncedMatchIdRef.current = selMatchId;
    setMode(matchTickerMode);
  }, [selMatchId, matchTickerMode, setMode]);

  const [generatingId, setGeneratingId] = useState<number | null>(null);

  // ── Ticker-Callbacks ──────────────────────────────────────
  const handleGenerate = useCallback(
    async (eventId: number, style: TickerStyle) => {
      setGeneratingId(eventId);
      try {
        await api.generateTicker(eventId, style, instance, language);
        await reload.loadTickerTexts();
      } catch (err) {
        logger.error("generateTicker error:", err);
      } finally {
        setGeneratingId(null);
      }
    },
    [reload, instance, language],
  );

  const handleManualPublish = useCallback(
    async (
      text: string,
      icon = "📝",
      minute?: number | null,
      phase?: MatchPhase | null,
      rawInput?: string,
    ) => {
      try {
        const res = await api.createManualTicker(
          selMatchId,
          text,
          icon,
          minute,
          phase,
        );
        await reload.loadTickerTexts();
        if (res?.data?.id)
          showPublishToast(res.data.id, rawInput || text, true);
      } catch (err) {
        logger.error("manualPublish error:", err);
      }
    },
    [selMatchId, reload, showPublishToast],
  );

  const handleDraftActive = useCallback((id: number, text: string) => {
    setActiveDraftId(id);
    setActiveDraftText(text);
  }, []);

  const handleEditEntry = useCallback(
    async (id: number, text: string, minute?: number | null) => {
      await api.updateTicker(id, {
        text,
        ...(minute != null ? { minute } : {}),
      });
      await reload.loadTickerTexts();
    },
    [reload],
  );

  const handleDeleteEntry = useCallback(
    async (id: number) => {
      await api.deleteTicker(id);
      await reload.loadTickerTexts();
      if (deleteToastTimerRef.current)
        clearTimeout(deleteToastTimerRef.current);
      setDeleteToast(true);
      deleteToastTimerRef.current = setTimeout(
        () => setDeleteToast(false),
        2500,
      );
    },
    [reload],
  );

  // ── Context-Werte ─────────────────────────────────────────
  const tickerModeCtx: TickerModeContextValue = useMemo(
    () => ({ mode, setMode: handleModeChange, acceptDraft, rejectDraft }),
    [mode, handleModeChange, acceptDraft, rejectDraft],
  );

  const tickerActionsCtx = useMemo(
    () => ({
      onGenerate: handleGenerate,
      onManualPublish: handleManualPublish,
      onDraftActive: handleDraftActive,
      onPublished: showPublishToast,
      onEditEntry: handleEditEntry,
      onDeleteEntry: handleDeleteEntry,
      retractedText,
      clearRetractedText,
    }),
    [
      handleGenerate,
      handleManualPublish,
      handleDraftActive,
      showPublishToast,
      handleEditEntry,
      handleDeleteEntry,
      retractedText,
      clearRetractedText,
    ],
  );

  return {
    mode,
    handleModeChange,
    tickerModeCtx,
    tickerActionsCtx,
    generatingId,
    publishToast,
    setPublishToast,
    handleRetract,
    deleteToast,
  };
}
