import { useState, useEffect } from "react";
import config from "../config/whitelabel";

const HEALTH_URL = config.apiBase.split("/api")[0] + "/health";

/**
 * Überwacht den Backend-Gesundheitsstatus durch regelmäßige Polling-Anfragen.
 *
 * @returns {"checking"|"ok"|"degraded"|"offline"} Aktueller API-Status
 */
export function useApiStatus() {
  const [apiStatus, setApiStatus] = useState("checking");

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const res = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(4000) });
        if (cancelled) return;
        if (!res.ok) { setApiStatus("offline"); return; }
        const data = await res.json().catch(() => null);
        setApiStatus(data?.status === "healthy" ? "ok" : data?.status === "degraded" ? "degraded" : "ok");
      } catch {
        if (!cancelled) setApiStatus("offline");
      }
    }
    check();
    const id = setInterval(check, 30000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  return apiStatus;
}

export const API_STATUS_CFG = {
  checking: { dot: "#6b7385", label: "Verbinde…" },
  ok:       { dot: "#22c55e", label: "Bereit" },
  degraded: { dot: "#f59e0b", label: "Degradiert" },
  offline:  { dot: "#ef4444", label: "Offline" },
};
