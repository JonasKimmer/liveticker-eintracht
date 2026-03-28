// ============================================================
// LoadingScreen.jsx
// ============================================================
import { memo } from "react";

export const LoadingScreen: any = memo<any>(function LoadingScreen() {
  return (
    <div className="lt-loading">
      <div className="lt-loading__spinner" />
      <p className="lt-loading__text">Wird geladen…</p>
    </div>
  );
});

