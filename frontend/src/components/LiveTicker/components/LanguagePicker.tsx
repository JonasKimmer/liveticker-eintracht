// ============================================================
// components/LanguagePicker.jsx
// Sprachauswahl-Dropdown mit Click-Outside-Verhalten
// ============================================================
import { memo, useState, useRef } from "react";
import { useClickOutside } from "hooks/useClickOutside";

const LANGUAGES = [
  { code: "de", label: "Deutsch" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
];

interface LanguagePickerProps {
  language: string;
  onLanguageChange: (code: string) => void;
}

export const LanguagePicker = memo(function LanguagePicker({
  language,
  onLanguageChange,
}: LanguagePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useClickOutside(ref, () => setOpen(false));

  return (
    <div className="lt-lang-picker" ref={ref}>
      <button
        className="lt-lang-picker__trigger"
        onClick={() => setOpen((v) => !v)}
        title="Ausgabesprache für Ticker-Texte"
      >
        Ticker: {language.toUpperCase()}
        <svg
          width="8"
          height="8"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          style={{
            transition: "transform 0.15s",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            marginLeft: 2,
          }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="lt-lang-picker__menu">
          <div className="lt-lang-picker__hint">
            Ausgabesprache für KI-Texte
          </div>
          {LANGUAGES.map(({ code, label }) => (
            <button
              key={code}
              className={`lt-lang-picker__item${language === code ? " lt-lang-picker__item--active" : ""}`}
              onClick={() => {
                onLanguageChange(code);
                setOpen(false);
              }}
            >
              <span className="lt-lang-picker__code">{code.toUpperCase()}</span>
              <span className="lt-lang-picker__label">{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
