import { useState, useEffect, useMemo, useCallback } from "react";
import type React from "react";

/**
 * Spielername-Autocomplete für Freitext-Eingabefelder.
 *
 * @param {string}   value        – Aktueller Eingabewert
 * @param {string[]} playerNames  – Liste der verfügbaren Spielernamen
 * @param {{ showPalette?: boolean, onReplace: (v: string) => void, inputRef?: React.RefObject }} opts
 *   - showPalette: Unterdrückt Vorschläge wenn Command-Palette offen ist
 *   - onReplace:   Wird mit dem neuen Wert nach Name-Auswahl aufgerufen
 *   - inputRef:    Ref auf das Eingabefeld – wird nach Auswahl re-fokussiert
 *
 * @returns {{ lastWord, nameSuggestions, showNames, nameIdx, setNameIdx, selectName }}
 */
export function useNameAutocomplete(
  value: string,
  playerNames: string[],
  {
    showPalette = false,
    onReplace,
    inputRef,
  }: {
    showPalette?: boolean;
    onReplace?: (v: string) => void;
    inputRef?: React.RefObject<HTMLElement>;
  } = {},
) {
  const [nameIdx, setNameIdx] = useState(0);

  // Letztes getipptes Wort (Suchbegriff für Autocomplete)
  const lastWord = useMemo(() => {
    if (value.startsWith("/") && !value.includes(" ")) return "";
    const words = value.split(/\s+/);
    return words[words.length - 1] ?? "";
  }, [value]);

  // Vorschläge: Treffer auf vollständigen Namen ODER auf einzelne Wortteile
  const nameSuggestions = useMemo(() => {
    if (!lastWord) return [];
    const q = lastWord.toLowerCase();
    return playerNames
      .filter((name) => {
        const parts = name.toLowerCase().split(/\s+/);
        return (
          parts.some((part) => part.startsWith(q) && part !== q) ||
          (name.toLowerCase().startsWith(q) && name.toLowerCase() !== q)
        );
      })
      .slice(0, 6);
  }, [lastWord, playerNames]);

  const showNames = nameSuggestions.length > 0 && !showPalette;

  // Index zurücksetzen wenn sich Vorschläge ändern
  useEffect(() => {
    setNameIdx(0);
  }, [nameSuggestions]);

  // Letztes Wort durch den ausgewählten Namen ersetzen
  const selectName = useCallback(
    (name) => {
      const words = value.split(/\s+/);
      words[words.length - 1] = name;
      onReplace(words.join(" ") + " ");
      setTimeout(() => inputRef?.current?.focus(), 0);
    },
    [value, onReplace, inputRef],
  );

  return {
    lastWord,
    nameSuggestions,
    showNames,
    nameIdx,
    setNameIdx,
    selectName,
  };
}
