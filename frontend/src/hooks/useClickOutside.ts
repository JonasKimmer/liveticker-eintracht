import { useEffect, type RefObject } from "react";

/**
 * Ruft `onClose` auf wenn ein Mausklick außerhalb von `ref` erkannt wird.
 *
 * @param {React.RefObject} ref - Ref des DOM-Elements, das als Grenze gilt.
 * @param {() => void} onClose - Callback, der beim Außen-Klick ausgeführt wird.
 */
export function useClickOutside(
  ref: RefObject<HTMLElement>,
  onClose: () => void,
) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, onClose]);
}
