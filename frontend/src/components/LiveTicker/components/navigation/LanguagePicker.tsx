// ============================================================
// components/LanguagePicker.jsx
// Inline-Sprachauswahl als flache Buttons: DE | ES | FR | EN
// ============================================================
import { memo } from "react";

const LANGUAGES = [
  { code: "de", label: "DE" },
  { code: "en", label: "EN" },
  { code: "es", label: "ES" },
  { code: "fr", label: "FR" },
];

interface LanguagePickerProps {
  language: string;
  onLanguageChange: (code: string) => void;
}

export const LanguagePicker = memo(function LanguagePicker({
  language,
  onLanguageChange,
}: LanguagePickerProps) {
  return (
    <div className="lt-lang-inline" title="Ausgabesprache für KI-Texte">
      {LANGUAGES.map(({ code, label }) => (
        <button
          key={code}
          className={`lt-lang-inline__btn${language === code ? " lt-lang-inline__btn--active" : ""}`}
          onClick={() => onLanguageChange(code)}
        >
          {label}
        </button>
      ))}
    </div>
  );
});
