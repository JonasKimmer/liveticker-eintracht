import { useEffect, useRef, useCallback } from "react";
import config from "../config/whitelabel";
import logger from "../utils/logger";

// http://localhost:8001/api/v1 → ws://localhost:8001/ws/media
const WS_URL = config.apiBase.replace(/^http/, "ws").replace(/\/api\/v1.*$/, "") + "/ws/media";

// Exponential Backoff: 1s → 2s → 4s → 8s → max 30s
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30_000;

/**
 * useMediaWebSocket
 *
 * Öffnet eine WebSocket-Verbindung zu /ws/media und reconnectet bei
 * Verbindungsabbruch automatisch mit exponentiellem Backoff.
 *
 * @param {(items: object[]) => void} onNewMedia  – Callback bei neuen Bildern
 * @param {boolean} enabled                       – Verbindung aktivieren/deaktivieren
 */
export function useMediaWebSocket(onNewMedia, enabled = true) {
  const wsRef = useRef(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef(null);
  const mountedRef = useRef(true);
  const onNewMediaRef = useRef(onNewMedia);

  // Ref aktuell halten ohne reconnect zu triggern
  useEffect(() => {
    onNewMediaRef.current = onNewMedia;
  }, [onNewMedia]);

  const connect = useCallback(() => {
    if (!mountedRef.current || !enabled) return;

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        retryCountRef.current = 0;
        console.debug("[MediaWS] Verbunden.");
      };

      ws.onmessage = (evt) => {
        if (!mountedRef.current) return;
        try {
          const msg = JSON.parse(evt.data);
          if (msg.type === "new_media" && Array.isArray(msg.items)) {
            onNewMediaRef.current(msg.items);
          }
        } catch (e) {
          console.warn("[MediaWS] Nachricht konnte nicht geparst werden:", e);
        }
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        wsRef.current = null;

        const delay = Math.min(
          BASE_DELAY_MS * 2 ** retryCountRef.current,
          MAX_DELAY_MS
        );
        retryCountRef.current += 1;
        console.debug(`[MediaWS] Verbindung getrennt – Reconnect in ${delay}ms`);

        retryTimerRef.current = setTimeout(() => {
          if (mountedRef.current) connect();
        }, delay);
      };

      ws.onerror = (err) => {
        console.warn("[MediaWS] Fehler:", err);
        ws.close(); // löst onclose → reconnect aus
      };
    } catch (err) {
      logger.error("[MediaWS] Verbindung fehlgeschlagen:", err);
    }
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    mountedRef.current = true;

    if (enabled) {
      connect();
    }

    return () => {
      mountedRef.current = false;
      clearTimeout(retryTimerRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // verhindert Reconnect beim Unmount
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect, enabled]);
}
