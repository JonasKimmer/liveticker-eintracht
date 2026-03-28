import { useRef, useEffect } from "react";
import { MODES, TICKER_STYLES } from "../constants";
import { useTickerModeContext } from "context/TickerModeContext";
import { useTickerDataContext } from "context/TickerDataContext";
import * as api from "api";
import logger from "utils/logger";

const AUTO_STYLE = TICKER_STYLES[0];

/**
 * Steuert den AUTO-Modus: generiert und veröffentlicht Drafts automatisch.
 *
 * @param {object} opts
 * @param {string}   opts.instance       - Whitelabel-Instance (z.B. "ef_whitelabel")
 * @param {Array}    opts.pendingEvents  - Events die noch keinen publizierten Ticker haben
 * @param {Function} opts.onError        - Callback bei Fehler: (message: string) => void
 */
export function useAutoPublisher({ instance, pendingEvents, onError }: any) {
  const { mode } = useTickerModeContext();
  const { match, tickerTexts, reload } = useTickerDataContext();
  const processingRef = useRef(new Set());

  // AUTO: manuelle Drafts (Zusammenfassungen) sofort publishen
  useEffect(() => {
    if (mode !== MODES.AUTO) return;
    const manualDrafts = tickerTexts.filter(
      (t) => t.status === "draft" && !t.event_id,
    );
    for (const d of manualDrafts) {
      if (processingRef.current.has(`manual-${d.id}`)) continue;
      processingRef.current.add(`manual-${d.id}`);
      api
        .publishTicker(d.id, d.text)
        .then(() => reload.loadTickerTexts())
        .catch((err) => logger.error("auto publish manual draft failed", err))
        .finally(() => processingRef.current.delete(`manual-${d.id}`));
    }
  }, [mode, tickerTexts]); // eslint-disable-line react-hooks/exhaustive-deps

  // AUTO: Events → generieren → publishen
  useEffect(() => {
    if (mode !== MODES.AUTO) return;

    for (const ev of pendingEvents) {
      if (processingRef.current.has(ev.id)) continue;

      const existingDraft = tickerTexts.find((t) => t.event_id === ev.id);

      if (existingDraft && existingDraft.status !== "published") {
        processingRef.current.add(ev.id);
        api
          .publishTicker(existingDraft.id, existingDraft.text)
          .then(() => reload.loadTickerTexts())
          .catch((err) => {
            logger.error("auto publish failed", err);
            onError(
              err?.response?.data?.detail ??
                err.message ??
                "Auto-Publish fehlgeschlagen",
            );
          })
          .finally(() => processingRef.current.delete(ev.id));
      } else if (!existingDraft) {
        processingRef.current.add(ev.id);
        api
          .generateTicker(ev.id, AUTO_STYLE, instance)
          .then(() => reload.loadTickerTexts())
          .then(async () => {
            const res = await api.fetchTickerTexts(match.id);
            const draft = res.data.find(
              (t) => t.event_id === ev.id && t.status !== "published",
            );
            if (draft) {
              await api.publishTicker(draft.id, draft.text);
              await reload.loadTickerTexts();
            }
          })
          .catch((err) => {
            logger.error("auto generate+publish failed", err);
            onError(
              err?.response?.data?.detail ??
                err.message ??
                "Auto-Generierung fehlgeschlagen",
            );
          })
          .finally(() => processingRef.current.delete(ev.id));
      }
    }
  }, [mode, pendingEvents, tickerTexts]); // eslint-disable-line react-hooks/exhaustive-deps
}
