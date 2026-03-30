import { memo, useRef, useEffect } from "react";
import PropTypes from "prop-types";

/**
 * Video-Element das automatisch startet (Browser ignorieren autoPlay oft).
 * Wird in CenterPanel (Video-Drafts) verwendet.
 */
export const AutoPlayVideo = memo(function AutoPlayVideo({ src, style }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.play().catch(() => {});
  }, [src]);
  return (
    <video ref={ref} src={src} loop muted playsInline controls style={style} />
  );
});

AutoPlayVideo.propTypes = {
  src: PropTypes.string.isRequired,
  style: PropTypes.object,
};
