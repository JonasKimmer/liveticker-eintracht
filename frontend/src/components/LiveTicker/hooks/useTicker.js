// ============================================================
// hooks/useTicker.js
// Alle Ticker-Actions, Drafts, Toasts und Modus-Verwaltung
// ============================================================
import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import * as api from "api";
import logger from "utils/logger";
import { useTickerMode } from "hooks/useTickerMode";

/**
 * @param {{ selMatchId: number|null, reload: object, instance: string, language: string }} params
 */
export function useTicker({ selMatchId, reload, instance, language }) {
  // ── Aktiver Draft ─────────────────────────────────────────
  const [activeDraftId, setActiveDraftId] = useState(null);
  const [activeDraftText, setActiveDraftText] = useState("");

  // ── Publish Toast (Undo) ───────────────────────────────────
  const [publishToast, setPublishToast] = useState(null); // { id, text, isManual }
  const [retractedText, setRetractedText] = useState(null);
  const clearRetractedText = useCallback(() => setRetractedText(null), []);

  // ── Delete Toast ───────────────────────────────────────────
  const [deleteToast, setDeleteToast] = useState(false);
  const deleteToastTimerRef = useRef(null);

  const showPublishToast = useCallback((id, text, isManual = false) => {
    setPublishToast({ id, text, isManual });
  }, []);

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

  const { mode, setMode } = useTickerMode(acceptDraft, rejectDraft);

  // Modus in DB speichern wenn gewechselt wird
  const handleModeChange = useCallback(
    async (newMode) => {
      setMode(newMode);
      if (selMatchId) {
        try {
          await api.setMatchTickerMode(selMatchId, newMode);
        } catch (_) {}
      }
    },
    [setMode, selMatchId],
  );

  // Modus in DB schreiben wenn Spiel gewechselt wird
  const modeRef = useRef(mode);
  modeRef.current = mode;
  useEffect(() => {
    if (!selMatchId) return;
    api.setMatchTickerMode(selMatchId, modeRef.current).catch(() => {});
  }, [selMatchId]);

  const [generatingId, setGeneratingId] = useState(null);

  // ── Ticker-Callbacks ──────────────────────────────────────
  const handleGenerate = useCallback(
    async (eventId, style) => {
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
    async (text, icon = "📝", minute, phase, rawInput) => {
      try {
        const res = await api.createManualTicker(
          selMatchId,
          text,
          icon,
          minute,
          phase,
        );
        await reload.loadTickerTexts();
        if (res?.data?.id) showPublishToast(res.data.id, rawInput || text, true);
      } catch (err) {
        logger.error("manualPublish error:", err);
      }
    },
    [selMatchId, reload, showPublishToast],
  );

  const handleDraftActive = useCallback((id, text) => {
    setActiveDraftId(id);
    setActiveDraftText(text);
  }, []);

  const handleEditEntry = useCallback(
    async (id, text) => {
      await api.updateTicker(id, { text });
      await reload.loadTickerTexts();
    },
    [reload],
  );

  const handleDeleteEntry = useCallback(
    async (id) => {
      await api.deleteTicker(id);
      await reload.loadTickerTexts();
      if (deleteToastTimerRef.current) clearTimeout(deleteToastTimerRef.current);
      setDeleteToast(true);
      deleteToastTimerRef.current = setTimeout(() => setDeleteToast(false), 2500);
    },
    [reload],
  );

  // ── Context-Werte ─────────────────────────────────────────
  const tickerModeCtx = useMemo(
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
