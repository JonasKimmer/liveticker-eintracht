// ============================================================
// LoadingScreen.tsx
// ============================================================
import { memo } from "react";
import { Spinner } from "./Spinner";

export const LoadingScreen = memo(function LoadingScreen() {
  return (
    <div className="lt-loading">
      <Spinner size={56} />
      <p className="lt-loading__text">Wird geladen…</p>
    </div>
  );
});
