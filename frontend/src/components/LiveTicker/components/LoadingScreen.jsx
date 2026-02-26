// ============================================================
// LoadingScreen.jsx
// ============================================================
import React from "react";

export function LoadingScreen() {
  return (
    <div className="lt-loading">
      <div className="lt-loading__spinner" />
      <p className="lt-loading__text">Wird geladen…</p>
    </div>
  );
}
