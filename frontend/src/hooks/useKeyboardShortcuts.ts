/**
 * useKeyboardShortcuts
 * ====================
 * Registriert globale Tastatur-Shortcuts und Custom-Events für die LiveTicker-UI.
 *
 * Shortcuts:
 * - `?`           → onToggleHints() (nur außerhalb von Textarea/Input)
 * - lt-show-hints → onShowHints()   (Custom Event, z.B. aus Bild-DoubleClick)
 * - lt-show-commands → onShowCommands() (Custom Event aus Toolbar-Icons)
 *
 * @param {{ onToggleHints: () => void, onShowHints: () => void, onShowCommands: () => void }} handlers
 */
import { useEffect } from "react";

export function useKeyboardShortcuts({ onToggleHints, onShowHints, onShowCommands }: any) {
  useEffect(() => {
    const handler = (e) => {
      const tag = e.target?.tagName;
      if (
        e.key === "?" &&
        !e.ctrlKey &&
        !e.metaKey &&
        tag !== "TEXTAREA" &&
        tag !== "INPUT"
      )
        onToggleHints();
    };
    const imgHandler = () => onShowHints();
    const cmdHandler = () => onShowCommands();

    window.addEventListener("keydown", handler);
    window.addEventListener("lt-show-hints", imgHandler);
    window.addEventListener("lt-show-commands", cmdHandler);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("lt-show-hints", imgHandler);
      window.removeEventListener("lt-show-commands", cmdHandler);
    };
  }, [onToggleHints, onShowHints, onShowCommands]);
}
