import { useState, useCallback } from "react";
import { PREMATCH_PHASES } from "../constants";
import { useTickerDataContext } from "context/TickerDataContext";
import * as api from "api";
import logger from "utils/logger";

const AUTO_STYLE = "neutral";

/**
 * Kapselt alle Bulk-Publish/Generate-Handler sowie Style-Regeneration für Summary-Drafts.
 *
 * @param {object} opts
 * @param {string}   opts.instance                - Whitelabel-Instance
 * @param {Array}    opts.pendingEvents            - Noch nicht veröffentlichte Events
 * @param {Function} opts.setSelectedSummaryDraftId - Setter aus CenterPanel-State
 */
interface UseBulkActionsParams {
  instance: string;
  language?: string;
  tickerMode?: string;
  pendingEvents: import("../../../types").MatchEvent[];
  setSelectedSummaryDraftId: (id: number | null) => void;
}

export function useBulkActions({ instance, language = "de", tickerMode = "coop", pendingEvents, setSelectedSummaryDraftId }: UseBulkActionsParams) {
  const { match, tickerTexts, reload } = useTickerDataContext();
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkPublishingSection, setBulkPublishingSection] = useState<string | null>(null);

  // ── Events: alle vorhandenen Drafts publishen ─────────────
  const handleBulkPublish = useCallback(async () => {
    setBulkGenerating(true);
    try {
      const freshRes = await api.fetchTickerTexts(match.id);
      const drafts = (freshRes.data ?? []).filter(
        (t) => t.status !== "published" && t.event_id,
      );
      for (const d of drafts) {
        if (d.video_url) {
          await api.updateTicker(d.id, { status: "published" });
        } else {
          await api.publishTicker(d.id, d.text);
        }
      }
      await reload.loadTickerTexts();
    } catch (err) {
      logger.error("bulkPublish failed", err);
    } finally {
      setBulkGenerating(false);
    }
  }, [match, reload]);

  // ── Events: alle Events generieren + publishen ────────────
  const handleBulkGenerate = useCallback(async () => {
    if (!pendingEvents.length) return;
    setBulkGenerating(true);
    try {
      const withoutDraft = pendingEvents.filter(
        (ev) => !tickerTexts.find((t) => t.event_id === ev.id),
      );
      for (const ev of withoutDraft) {
        await api.generateTicker(ev.id, AUTO_STYLE, instance);
      }
      const freshRes = await api.fetchTickerTexts(match.id);
      const drafts = (freshRes.data ?? []).filter(
        (t) => t.status !== "published" && t.event_id,
      );
      for (const d of drafts) {
        if (d.video_url) {
          await api.updateTicker(d.id, { status: "published" });
        } else {
          await api.publishTicker(d.id, d.text);
        }
      }
      await reload.loadTickerTexts();
    } catch (err) {
      logger.error("bulkGenerate failed", err);
    } finally {
      setBulkGenerating(false);
    }
  }, [pendingEvents, tickerTexts, match, reload, instance]);

  // ── Vorberichterstattung: alle Drafts publishen ──────────
  const handleBulkPublishPrematch = useCallback(async () => {
    setBulkPublishingSection("prematch");
    try {
      const freshRes = await api.fetchTickerTexts(match.id);
      const drafts = (freshRes.data ?? []).filter(
        (t) => t.status === "draft" && !t.event_id && PREMATCH_PHASES.has(t.phase),
      );
      for (const d of drafts) await api.publishTicker(d.id, d.text);
      await reload.loadTickerTexts();
    } catch (err) {
      logger.error("bulkPublishPrematch failed", err);
    } finally {
      setBulkPublishingSection(null);
    }
  }, [match, reload]);

  // ── Spielphasen: alle Drafts + Videos publishen ──────────
  const handleBulkPublishSpielphase = useCallback(async () => {
    setBulkPublishingSection("spielphasen");
    try {
      const freshRes = await api.fetchTickerTexts(match.id);
      const drafts = (freshRes.data ?? []).filter(
        (t) => t.status === "draft" && !t.event_id && !t.video_url && !PREMATCH_PHASES.has(t.phase),
      );
      for (const d of drafts) {
        if (d.icon === "🎬" || d.video_url) {
          await api.updateTicker(d.id, { status: "published" });
        } else {
          await api.publishTicker(d.id, d.text);
        }
      }
      await reload.loadTickerTexts();
    } catch (err) {
      logger.error("bulkPublishSpielphase failed", err);
    } finally {
      setBulkPublishingSection(null);
    }
  }, [match, reload]);

  // ── Style-Regeneration für einen Summary-Draft ────────────
  // Nutzt gezielt /generate-synthetic für den spezifischen synthetic_event_id —
  // kein Batch-Call, damit andere gelöschte Drafts nicht zurückspawnen.
  const handleRegenerateSummaryDraft = useCallback(
    async (draftId: number, style: string) => {
      setBulkPublishingSection("regenerating");
      const oldDraft = tickerTexts.find((t) => t.id === draftId);
      if (!oldDraft) { setBulkPublishingSection(null); return; }
      const phase = oldDraft.phase;
      const isPrematch = PREMATCH_PHASES.has(phase);
      try {
        // Hard-delete so backend's duplicate check doesn't block regeneration
        await api.deleteTicker(draftId);

        if (oldDraft.synthetic_event_id) {
          // Spielphase mit synthetic_event_id: gezielt diesen einen Eintrag neu generieren
          await api.generateSyntheticEvent(
            oldDraft.synthetic_event_id,
            style,
            instance,
          );
          await reload.loadTickerTexts();
          const res = await api.fetchTickerTexts(match.id);
          const newDraft = (res.data ?? []).find(
            (t) => t.synthetic_event_id === oldDraft.synthetic_event_id && t.status === "draft",
          );
          setSelectedSummaryDraftId(newDraft?.id ?? null);
        } else if (isPrematch) {
          // Vorberichterstattung ohne synthetic_event_id → Batch-Fallback
          await api.generateSyntheticBatch(match.id, style, instance);
          await reload.loadTickerTexts();
          const res = await api.fetchTickerTexts(match.id);
          const newDraft = (res.data ?? []).find(
            (t) => t.status === "draft" && !t.event_id && t.phase === phase,
          );
          setSelectedSummaryDraftId(newDraft?.id ?? null);
        } else {
          // Summary-Phase (FirstHalfBreak, After) — kommt von n8n, asynchron
          // n8n-Call feuern, dann mit Verzögerung neu laden bis Draft erscheint
          api.generateMatchSummary(match.id, phase, style, instance, language, tickerMode)
            .catch((err) => logger.error("generateMatchSummary failed", err));
          setSelectedSummaryDraftId(null);
          const matchId = match.id;
          for (const delay of [4000, 9000, 16000]) {
            await new Promise((r) => setTimeout(r, delay));
            await reload.loadTickerTexts();
            const res = await api.fetchTickerTexts(matchId);
            const newDraft = (res.data ?? []).find(
              (t) => t.status === "draft" && !t.event_id && t.phase === phase,
            );
            if (newDraft) { setSelectedSummaryDraftId(newDraft.id); break; }
          }
        }
      } catch (err) {
        logger.error("regenerateSummaryDraft failed", err);
        setSelectedSummaryDraftId(null);
      } finally {
        setBulkPublishingSection(null);
      }
    },
    [tickerTexts, match, reload, instance, setSelectedSummaryDraftId],
  );

  return {
    bulkGenerating,
    bulkPublishingSection,
    handleBulkPublish,
    handleBulkGenerate,
    handleBulkPublishPrematch,
    handleBulkPublishSpielphase,
    handleRegenerateSummaryDraft,
  };
}
