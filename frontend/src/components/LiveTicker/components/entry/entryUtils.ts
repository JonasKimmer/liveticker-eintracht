// ============================================================
// entryUtils.ts — Utility functions for PublishedEntry
// ============================================================
import { MEDIA_DEFAULT_ICONS, URL_PATTERNS } from "../../constants";
import type { TickerEntry } from "../../../../types";

export function getMediaIcon(
  videoUrl: string | null | undefined,
  imageUrl: string | null | undefined,
  fallback: string,
) {
  if (!videoUrl && !imageUrl) return fallback;
  if (videoUrl && URL_PATTERNS.twitter.test(videoUrl)) return "𝕏";
  if (videoUrl && URL_PATTERNS.instagram.test(videoUrl)) return "📸";
  if (videoUrl && URL_PATTERNS.youtube.test(videoUrl)) return "▶";
  if (videoUrl) return "🎬";
  return "📸";
}

export function getMediaLabel(
  videoUrl: string | null | undefined,
  imageUrl: string | null | undefined,
) {
  if (videoUrl && URL_PATTERNS.twitter.test(videoUrl)) return "tweet · manuell";
  if (videoUrl && URL_PATTERNS.instagram.test(videoUrl))
    return "instagram · manuell";
  if (videoUrl && URL_PATTERNS.youtube.test(videoUrl))
    return "youtube · manuell";
  if (videoUrl) return "clip · manuell";
  if (imageUrl) return "foto · manuell";
  return "manuell";
}

export function getDisplayText(tickerText: TickerEntry) {
  const hasMedia = tickerText?.video_url || tickerText?.image_url;
  const isCodeKey = tickerText?.icon && /^[a-z0-9_]+$/i.test(tickerText.icon);
  const hasCustomIcon =
    hasMedia &&
    !isCodeKey &&
    tickerText?.icon &&
    !MEDIA_DEFAULT_ICONS.includes(tickerText.icon);
  return hasCustomIcon
    ? `${tickerText.icon} ${tickerText?.text}`
    : tickerText?.text;
}
