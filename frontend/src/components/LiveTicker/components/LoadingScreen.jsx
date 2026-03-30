// ============================================================
// LoadingScreen.jsx
// ============================================================
import { memo } from "react";
import PropTypes from "prop-types";

export const LoadingScreen = memo(function LoadingScreen() {
  return (
    <div className="lt-loading">
      <div className="lt-loading__spinner" />
      <p className="lt-loading__text">Wird geladen…</p>
    </div>
  );
});

LoadingScreen.propTypes = {};
