// ============================================================
// SettingsModal.tsx
// Einstellungen: Sprache + editierbare Prompt-Stilprofile
// ============================================================
import { memo, useEffect, useRef, useState } from "react";
import { TICKER_STYLES, STYLE_META } from "../constants";

const LANGUAGES = [
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
];

// Fallback-Beschreibungen (identisch mit backend/app/core/constants.py STYLE_DESC)
const STYLE_DESC_FALLBACK: Record<string, string> = {
  neutral: "sachlich und neutral – keine Vereinspräferenz",
  euphorisch: "begeistert und emotional – aus Sicht der Heimfans",
  kritisch: "analytisch und kritisch",
};

type Tab = "sprache" | "prompts";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  language: string;
  onLanguageChange: (code: string) => void;
  settings: Record<string, string>;
  updateSetting: (key: string, value: string) => Promise<void>;
  loading: boolean;
}

export const SettingsModal = memo(function SettingsModal({
  open,
  onClose,
  language,
  onLanguageChange,
  settings,
  updateSetting,
  loading,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>("sprache");
  const overlayRef = useRef<HTMLDivElement>(null);

  // ESC schließt Modal
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Klick auf Overlay schließt Modal
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  if (!open) return null;

  return (
    <div
      className="lt-settings-overlay"
      ref={overlayRef}
      onClick={handleOverlayClick}
    >
      <div className="lt-settings-modal">
        <div className="lt-settings-header">
          <span className="lt-settings-title">⚙ Einstellungen</span>
          <button
            className="lt-settings-close"
            onClick={onClose}
            title="Schließen"
          >
            ✕
          </button>
        </div>

        <div className="lt-settings-tabs">
          <button
            className={`lt-settings-tab${activeTab === "sprache" ? " lt-settings-tab--active" : ""}`}
            onClick={() => setActiveTab("sprache")}
          >
            🌐 Sprache
          </button>
          <button
            className={`lt-settings-tab${activeTab === "prompts" ? " lt-settings-tab--active" : ""}`}
            onClick={() => setActiveTab("prompts")}
          >
            ✍️ Prompts
          </button>
        </div>

        <div className="lt-settings-body">
          {activeTab === "sprache" && (
            <LanguageTab
              language={language}
              onLanguageChange={onLanguageChange}
            />
          )}
          {activeTab === "prompts" && (
            <PromptsTab
              settings={settings}
              updateSetting={updateSetting}
              loading={loading}
            />
          )}
        </div>
      </div>
    </div>
  );
});

// ── Sprache-Tab ─────────────────────────────────────────────
function LanguageTab({
  language,
  onLanguageChange,
}: {
  language: string;
  onLanguageChange: (code: string) => void;
}) {
  return (
    <div className="lt-settings-lang">
      <p className="lt-settings-hint">
        Legt die Ausgabesprache für KI-generierte Ticker-Texte fest.
      </p>
      <div className="lt-settings-lang-grid">
        {LANGUAGES.map(({ code, label, flag }) => (
          <button
            key={code}
            className={`lt-settings-lang-btn${language === code ? " lt-settings-lang-btn--active" : ""}`}
            onClick={() => onLanguageChange(code)}
          >
            <span className="lt-settings-lang-flag">{flag}</span>
            <span className="lt-settings-lang-code">{code.toUpperCase()}</span>
            <span className="lt-settings-lang-label">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Prompts-Tab ─────────────────────────────────────────────
function PromptsTab({
  settings,
  updateSetting,
  loading,
}: {
  settings: Record<string, string>;
  updateSetting: (key: string, value: string) => Promise<void>;
  loading: boolean;
}) {
  if (loading) {
    return <div className="lt-settings-hint">Lade Einstellungen…</div>;
  }

  return (
    <div className="lt-settings-prompts">
      <p className="lt-settings-hint">
        Diese Beschreibungen werden im <code>### STIL</code>-Block jedes
        LLM-Prompts verwendet. Änderungen wirken sofort beim nächsten
        generierten Ticker-Text.
      </p>
      {TICKER_STYLES.map((style) => (
        <PromptCard
          key={style}
          style={style}
          currentValue={
            settings[`style_desc_${style}`] ?? STYLE_DESC_FALLBACK[style] ?? ""
          }
          onSave={(val) => updateSetting(`style_desc_${style}`, val)}
        />
      ))}
    </div>
  );
}

// ── Einzelne Prompt-Karte ────────────────────────────────────
function PromptCard({
  style,
  currentValue,
  onSave,
}: {
  style: string;
  currentValue: string;
  onSave: (val: string) => Promise<void>;
}) {
  const meta = STYLE_META[style as keyof typeof STYLE_META];
  const [value, setValue] = useState(currentValue);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // Wert synchronisieren wenn sich Settings extern ändern
  useEffect(() => {
    setValue(currentValue);
  }, [currentValue]);

  const handleSave = async () => {
    if (saving || value === currentValue) return;
    setSaving(true);
    try {
      await onSave(value);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const isDirty = value !== currentValue;

  return (
    <div className="lt-settings-prompt-card">
      <div className="lt-settings-prompt-header">
        <span className="lt-settings-prompt-emoji">{meta?.emoji}</span>
        <span className="lt-settings-prompt-label">{meta?.label ?? style}</span>
        <code className="lt-settings-prompt-key">style_desc_{style}</code>
      </div>
      <textarea
        className="lt-settings-textarea"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={3}
        placeholder={STYLE_DESC_FALLBACK[style]}
      />
      <div className="lt-settings-prompt-actions">
        {isDirty && !saved && (
          <button
            className="lt-settings-save-btn"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Speichere…" : "Speichern"}
          </button>
        )}
        {saved && <span className="lt-settings-saved">✓ Gespeichert</span>}
        {!isDirty && !saved && (
          <span className="lt-settings-unchanged">Kein Änderungen</span>
        )}
      </div>
    </div>
  );
}
