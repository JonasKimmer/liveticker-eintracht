import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";

const DURATION = 5000; // ms

export function PublishToast({ entryId, text, onRetract, onDismiss }) {
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const intervalRef = useRef(null);
  const startRef = useRef(Date.now());

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const remaining = Math.max(0, DURATION - elapsed);
      setTimeLeft(remaining);
      if (remaining === 0) {
        clearInterval(intervalRef.current);
        onDismiss();
      }
    }, 50);
    return () => clearInterval(intervalRef.current);
  }, [onDismiss]);

  const seconds = Math.ceil(timeLeft / 1000);
  const progress = (timeLeft / DURATION) * 100;

  return (
    <div className="lt-publish-toast">
      <div className="lt-publish-toast__top">
        <span className="lt-publish-toast__status">
          <span className="lt-publish-toast__dot" />
          PUBLISHED — Retract in {seconds}s
        </span>
        <button className="lt-publish-toast__retract" onClick={onRetract}>
          ↩ RETRACT
        </button>
      </div>
      <p className="lt-publish-toast__text">
        {text?.length > 80 ? text.slice(0, 80) + "…" : text}
      </p>
      <div className="lt-publish-toast__bar-track">
        <div
          className="lt-publish-toast__bar"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

PublishToast.propTypes = {
  entryId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  text: PropTypes.string,
  onRetract: PropTypes.func.isRequired,
  onDismiss: PropTypes.func.isRequired,
};
