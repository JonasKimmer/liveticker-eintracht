import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useTickerDataContext } from "context/TickerDataContext";
import { useTickerActionsContext } from "context/TickerActionsContext";
import * as api from "api";
import logger from "utils/logger";
import type { PublishPayload } from "../../../types";

/**
 * Kapselt den gesamten Event-Draft-Workflow:
 * pendingEvents-Berechnung, Event-Selektion, Bearbeitungs-State
 * und alle zugehörigen Handler.
 */
export function useEventDraft() {
  const { events, tickerTexts, reload } = useTickerDataContext();
  const {
    onGenerate,
    onManualPublish,
    onDraftActive,
    onPublished,
    retractedText,
    clearRetractedText,
  } = useTickerActionsContext();

  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editorValue, setEditorValue] = useState("");
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set());
  const editorValueRef = useRef("");
  editorValueRef.current = editorValue;

  const pendingEvents = useMemo(() => {
    const seenSourceIds = new Set();
    return events.filter((ev) => {
      if (dismissedIds.has(ev.id)) return false;
      if (
        tickerTexts.find(
          (t) =>
            t.event_id === ev.id &&
            (t.status === "published" || t.status === "rejected"),
        )
      )
        return false;
      if (ev.sourceId) {
        if (seenSourceIds.has(ev.sourceId)) return false;
        seenSourceIds.add(ev.sourceId);
      }
      return true;
    });
  }, [events, dismissedIds, tickerTexts]);

  const selectedEvent = useMemo(
    () => pendingEvents.find((e) => e.id === selectedEventId) ?? null,
    [pendingEvents, selectedEventId],
  );

  const selectedDraft = useMemo(
    () =>
      selectedEvent
        ? tickerTexts.find(
            (t) => t.event_id === selectedEvent.id && t.status !== "deleted" && !t.video_url,
          )
        : null,
    [selectedEvent, tickerTexts],
  );

  const selectedVideoDraft = useMemo(
    () =>
      selectedEvent
        ? tickerTexts.find(
            (t) => t.event_id === selectedEvent.id && t.status !== "deleted" && !!t.video_url,
          )
        : null,
    [selectedEvent, tickerTexts],
  );

  // Aktiven Draft nach oben melden (CO-OP)
  useEffect(() => {
    if (selectedDraft) onDraftActive?.(selectedDraft.id, selectedDraft.text);
    else onDraftActive?.(null, "");
  }, [selectedDraft, onDraftActive]);

  // Text-Restore nach Manual-Stornierung
  useEffect(() => {
    if (!retractedText) return;
    if (!editorValueRef.current.trim()) setEditorValue(retractedText);
    clearRetractedText();
  }, [retractedText, clearRetractedText]);

  const handleDismissEvent = useCallback(
    async (ev, draft) => {
      if (draft) {
        await api.updateTicker(draft.id, { status: "rejected" });
        await reload.loadTickerTexts();
      } else {
        setDismissedIds((prev) => new Set([...prev, ev.id]));
      }
      if (selectedEventId === ev.id) setSelectedEventId(null);
    },
    [selectedEventId, reload],
  );

  const handleRegenerateEventDraft = useCallback(
    async (eventId, style) => {
      const existing = tickerTexts.find(
        (t) =>
          t.event_id === eventId &&
          t.status !== "rejected" &&
          t.status !== "deleted" &&
          !t.video_url,
      );
      if (existing) await api.deleteTicker(existing.id);
      await onGenerate(eventId, style);
    },
    [tickerTexts, onGenerate],
  );

  const handleAcceptDraft = useCallback(async () => {
    if (!selectedDraft) return;
    await api.publishTicker(selectedDraft.id, selectedDraft.text);
    if (selectedVideoDraft) {
      await api.updateTicker(selectedVideoDraft.id, { status: "published" });
    }
    await reload.loadTickerTexts();
    onPublished?.(selectedDraft.id, selectedDraft.text);
  }, [selectedDraft, selectedVideoDraft, reload, onPublished]);

  const handleRejectDraft = useCallback(async () => {
    if (!selectedDraft) return;
    await api.deleteTicker(selectedDraft.id);
    await reload.loadTickerTexts();
  }, [selectedDraft, reload]);

  const handleOpenEdit = useCallback(() => {
    setEditorValue(selectedDraft?.text ?? "");
    setEditMode(true);
  }, [selectedDraft]);

  const handleManualPublish = useCallback(
    async ({ text, icon, minute, phase }: PublishPayload = {}) => {
      const textToPublish = text ?? editorValue.trim();
      if (!textToPublish) return;
      const rawInput = editorValue.trim();
      await onManualPublish(textToPublish, icon, minute, phase, rawInput);
      setEditorValue("");
    },
    [editorValue, onManualPublish],
  );

  const handleEditPublish = useCallback(
    async ({ text }: Pick<PublishPayload, "text"> = {}) => {
      const textToPublish = text ?? editorValue.trim();
      if (!selectedDraft || !textToPublish) return;
      try {
        await api.publishTicker(selectedDraft.id, textToPublish);
        if (selectedVideoDraft) {
          await api.updateTicker(selectedVideoDraft.id, { status: "published" });
        }
        await reload.loadTickerTexts();
        onPublished?.(selectedDraft.id, textToPublish);
        setEditorValue("");
        setEditMode(false);
        setSelectedEventId(null);
      } catch (err) {
        logger.error("editPublish failed", err);
      }
    },
    [selectedDraft, selectedVideoDraft, editorValue, reload, onPublished],
  );

  return {
    pendingEvents,
    selectedEvent,
    selectedDraft,
    selectedEventId,
    setSelectedEventId,
    editMode,
    setEditMode,
    editorValue,
    setEditorValue,
    handleDismissEvent,
    handleRegenerateEventDraft,
    handleAcceptDraft,
    handleRejectDraft,
    handleOpenEdit,
    handleManualPublish,
    handleEditPublish,
  };
}
