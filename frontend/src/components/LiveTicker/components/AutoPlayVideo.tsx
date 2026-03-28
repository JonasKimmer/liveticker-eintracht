import { memo, useRef, useEffect } from "react";

/**
 * Video-Element das automatisch startet (Browser ignorieren autoPlay oft).
 * Wird in CenterPanel (Video-Drafts) verwendet.
 */
export const AutoPlayVideo: any = memo<any>(function AutoPlayVideo({ src, style }: any) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.play().catch(() => {});
  }, [src]);
  return (
    <video ref={ref} src={src} loop muted playsInline controls style={style} />
  );
});

