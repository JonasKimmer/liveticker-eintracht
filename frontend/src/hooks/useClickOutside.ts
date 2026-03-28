import { useEffect } from "react";

/**
 * Ruft `onClose` auf wenn ein Mausklick außerhalb von `ref` erkannt wird.
 *
 * @param {React.RefObject} ref - Ref des DOM-Elements, das als Grenze gilt.
 * @param {() => void} onClose - Callback, der beim Außen-Klick ausgeführt wird.
 */
export function useClickOutside(ref, onClose) {
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, onClose]);
}
