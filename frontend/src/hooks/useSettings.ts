import { useState, useEffect, useCallback } from "react";
import * as api from "../api";

export function useSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .fetchSettings()
      .then((r) => setSettings(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const updateSetting = useCallback(async (key: string, value: string) => {
    await api.updateSetting(key, value);
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  return { settings, updateSetting, loading };
}
