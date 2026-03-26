// ============================================================
// LiveTicker.jsx — Hauptkomponente
// ============================================================
import { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from "react";
import { useClickOutside } from "../../hooks/useClickOutside";
import "./LiveTicker.css";
import logger from "../../utils/logger";

import * as api from "../../api";
import { useMatchData } from "../../hooks/useMatchData";
import { useLiveMinute } from "../../hooks/useLiveMinute";
import { useTickerMode } from "../../hooks/useTickerMode";
import { useNavigation } from "../../hooks/useNavigation";
import { TickerModeContext } from "../../context/TickerModeContext";
import config from "../../config/whitelabel";

import { NAV_TABS } from "./constants";
import { LoadingScreen } from "./components/LoadingScreen";
import { MatchHeader } from "./components/MatchHeader";
import { ModeSelector } from "./components/ModeSelector";
import { KeyboardHints } from "./components/KeyboardHints";
import { LeftPanel } from "./panels/LeftPanel";
import { CenterPanel } from "./panels/CenterPanel";
import { RightPanel } from "./panels/RightPanel";
import { StartScreen } from "./components/StartScreen";
import { Breadcrumb } from "./components/Breadcrumb";
import { NavDrawer } from "./components/NavDrawer";
import { useApiStatus, API_STATUS_CFG } from "../../hooks/useApiStatus";
import { useMatchTriggers } from "../../hooks/useMatchTriggers";
import { usePanelResize } from "../../hooks/usePanelResize";
import { CommandsModal } from "./components/CommandsModal";
import { PublishToast } from "./components/PublishToast";
import ErrorBoundary from "../ErrorBoundary";

export default function LiveTicker() {
  // ── Navigation (Länder / Teams / Wettbewerbe / Spiele) ────
  const {
    appLoading,
    navProps,
    selMatchId,
    setSelMatchId,
    selTeamId,
    teams,
    curCompetition,
  } = useNavigation();

  // ── UI State ──────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const [mobilePanel, setMobilePanel] = useState("center");
  const [activeTab, setActiveTab] = useState("teams");

  // ── Resizable Panels ──────────────────────────────────────
  const { rightW, centerW, handleResizeMouseDown, handleCenterResizeMouseDown } = usePanelResize();

  // ── Match-Daten ───────────────────────────────────────────
  const {
    match,
    events,
    tickerTexts,
    prematch,
    lineups,
    matchStats,
    players,
    playerStats,
    injuries,
    reload,
  } = useMatchData(selMatchId);

  const liveMinute = useLiveMinute(match);
  const apiStatus  = useApiStatus();
  const apiCfg     = API_STATUS_CFG[apiStatus];

  // ── Aktiver Draft ─────────────────────────────────────────
  const [activeDraftId, setActiveDraftId] = useState(null);
  const [activeDraftText, setActiveDraftText] = useState("");

  // ── Publish Toast (Undo) ───────────────────────────────
  const [publishToast, setPublishToast] = useState(null); // { id, text }

  const showPublishToast = useCallback((id, text) => {
    setPublishToast({ id, text });
  }, []);

  const handleRetract = useCallback(async () => {
    if (!publishToast) return;
    try {
      await api.updateTicker(publishToast.id, { status: "draft" });
      await reload.loadTickerTexts();
    } catch (err) {
      logger.error("retract error:", err);
    } finally {
      setPublishToast(null);
    }
  }, [publishToast, reload]);

  const acceptDraft = useCallback(async () => {
    if (!activeDraftId) return;
    try {
      await api.publishTicker(activeDraftId, activeDraftText);
      await reload.loadTickerTexts();
      showPublishToast(activeDraftId, activeDraftText);
      setActiveDraftId(null);
      setActiveDraftText("");
    } catch (err) {
      logger.error("acceptDraft error:", err);
    }
  }, [activeDraftId, activeDraftText, reload, showPublishToast]);

  const rejectDraft = useCallback(async () => {
    if (!activeDraftId) return;
    try {
      await api.updateTicker(activeDraftId, { status: "rejected" });
      await reload.loadTickerTexts();
      setActiveDraftId(null);
      setActiveDraftText("");
    } catch (err) {
      logger.error("rejectDraft error:", err);
    }
  }, [activeDraftId, reload]);

  const { mode, setMode } = useTickerMode(acceptDraft, rejectDraft);

  // Modus in DB speichern wenn gewechselt wird
  const handleModeChange = useCallback(async (newMode) => {
    setMode(newMode);
    if (selMatchId) {
      try { await api.setMatchTickerMode(selMatchId, newMode); } catch (_) {}
    }
  }, [setMode, selMatchId]);

  // Modus in DB schreiben wenn Spiel gewechselt wird (damit n8n-Workflows den richtigen Modus lesen)
  useEffect(() => {
    if (!selMatchId) return;
    api.setMatchTickerMode(selMatchId, mode).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selMatchId]);

  const [generatingId, setGeneratingId] = useState(null);

  // ── Mobile Panel: Modus-abhängig wechseln ─────────────────
  useEffect(() => {
    if (mode === "auto") setMobilePanel("left");
    else setMobilePanel("center");
  }, [mode]);

  const tickerModeCtx = useMemo(
    () => ({ mode, setMode: handleModeChange, acceptDraft, rejectDraft }),
    [mode, handleModeChange, acceptDraft, rejectDraft],
  );

  // ── Instance + Style: automatisch EF wenn Frankfurt-Spiel ──
  const isEfMatch = useMemo(() => {
    const kw = config.teamKeyword?.toLowerCase() ?? "";
    if (!kw || !match) return false;
    const home = match.homeTeam?.name?.toLowerCase() ?? "";
    const away = match.awayTeam?.name?.toLowerCase() ?? "";
    return home.includes(kw) || away.includes(kw);
  }, [match]);
  const instance  = isEfMatch ? "ef_whitelabel" : "generic";
  const efStyle   = isEfMatch ? "euphorisch"    : "neutral";

  // ── Language ───────────────────────────────────────────────
  const [language, setLanguage] = useState("de");
  const [showLangPicker, setShowLangPicker] = useState(false);
  const langPickerRef = useRef(null);
  useClickOutside(langPickerRef, () => setShowLangPicker(false));

  const translateDebounceRef = useRef(null);
  const handleLanguageChange = useCallback((lang) => {
    setLanguage(lang);
    if (!selMatchId || lang === language) return;
    if (translateDebounceRef.current) clearTimeout(translateDebounceRef.current);
    translateDebounceRef.current = setTimeout(async () => {
      try {
        await api.translateTickerBatch(selMatchId, lang);
        await reload.loadTickerTexts();
      } catch (err) {
        logger.error("translateTickerBatch error:", err);
      }
    }, 600);
  }, [selMatchId, language, reload]);

  // ── n8n Webhooks + Auto-Imports ───────────────────────────
  useMatchTriggers({ selMatchId, match, events, lineups, matchStats, tickerTexts, instance, style: efStyle, language, tickerMode: mode, reload });

  // ── Keyboard Shortcuts ────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      const tag = e.target?.tagName;
      if (e.key === "?" && !e.ctrlKey && !e.metaKey && tag !== "TEXTAREA" && tag !== "INPUT")
        setShowHints((s) => !s);
    };
    const imgHandler = () => setShowHints(true);
    const cmdHandler = () => setShowCommands(true);
    window.addEventListener("keydown", handler);
    window.addEventListener("lt-show-hints", imgHandler);
    window.addEventListener("lt-show-commands", cmdHandler);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("lt-show-hints", imgHandler);
      window.removeEventListener("lt-show-commands", cmdHandler);
    };
  }, []);

  // ── Ticker-Callbacks ──────────────────────────────────────
  const handleGenerate = useCallback(async (eventId, style) => {
    setGeneratingId(eventId);
    try {
      await api.generateTicker(eventId, style, instance, language);
      await reload.loadTickerTexts();
    } catch (err) {
      logger.error("generateTicker error:", err);
    } finally {
      setGeneratingId(null);
    }
  }, [reload, instance, language]);

  const handleManualPublish = useCallback(async (text, icon = "📝", minute, phase) => {
    try {
      const res = await api.createManualTicker(selMatchId, text, icon, minute, phase);
      await reload.loadTickerTexts();
      if (res?.data?.id) showPublishToast(res.data.id, text);
    } catch (err) {
      logger.error("manualPublish error:", err);
    }
  }, [selMatchId, reload, showPublishToast]);

  const handleDraftActive = useCallback((id, text) => {
    setActiveDraftId(id);
    setActiveDraftText(text);
  }, []);

  const handleEditEntry = useCallback(async (id, text) => {
    await api.updateTicker(id, { text });
    await reload.loadTickerTexts();
  }, [reload]);

  const handleDeleteEntry = useCallback(async (id) => {
    await api.deleteTicker(id);
    await reload.loadTickerTexts();
  }, [reload]);

  const topBarRef = useRef(null);

  // Synchron vor Paint messen wenn Match sich ändert (MatchHeader/ModeBar erscheinen)
  useLayoutEffect(() => {
    const el = topBarRef.current;
    if (!el) return;
    document.documentElement.style.setProperty("--lt-top-bar-h", `${el.getBoundingClientRect().height}px`);
  }, [match]);

  // ResizeObserver für Orientierungswechsel + sonstige Größenänderungen
  useLayoutEffect(() => {
    const el = topBarRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      document.documentElement.style.setProperty("--lt-top-bar-h", `${entry.contentRect.height}px`);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Render ────────────────────────────────────────────────
  if (appLoading) return <LoadingScreen />;

  if (!selMatchId) {
    return (
      <div className="lt">
        <StartScreen {...navProps} />
      </div>
    );
  }

  return (
    <TickerModeContext.Provider value={tickerModeCtx}>
      <div className="lt">
        <div className="lt-top-bar" ref={topBarRef}>
        <header className="lt-header">
          <div
            className="lt-header__logo"
            onClick={() => setSelMatchId(null)}
            title="Zurück zur Startseite"
          >
            {config.clubName}
          </div>
          <Breadcrumb
            match={match}
            competition={curCompetition}
            country={navProps.selCountry}
            team={teams.find((t) => t.id === selTeamId)}
            round={navProps.selRound}
            matchdays={navProps.matchdays}
            onOpen={() => setModalOpen(true)}
          />
          <div className="lt-header__status">
            {NAV_TABS.filter((t) => t.id !== "teams").map(({ id, label }) => (
              <button
                key={id}
                className={`lt-header__nav-tab${activeTab === id ? " lt-header__nav-tab--active" : ""}`}
                onClick={() => { setActiveTab(id); setModalOpen(true); }}
              >
                {label}
              </button>
            ))}
            <span className="lt-header__sep">|</span>
            <div className="lt-header__dot" style={{ background: apiCfg.dot }} title={`Backend: ${apiCfg.label}`} />
            {instance === "ef_whitelabel" && (
              <span className="lt-header__hint lt-header__hint--active" title="EF-Schreibstil aktiv (Stilreferenzen aus DB)">
                EF
              </span>
            )}
            <span className="lt-header__sep">|</span>
            <div className="lt-lang-picker" ref={langPickerRef}>
              <button
                className="lt-lang-picker__trigger"
                onClick={() => setShowLangPicker((v) => !v)}
                title="Ticker-Sprache wechseln"
              >
                🌐 {language.toUpperCase()}
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  style={{ transition: "transform 0.15s", transform: showLangPicker ? "rotate(180deg)" : "rotate(0deg)", marginLeft: 2 }}>
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {showLangPicker && (
                <div className="lt-lang-picker__menu">
                  {[
                    { code: "de", label: "Deutsch" },
                    { code: "en", label: "English" },
                    { code: "es", label: "Español" },
                    { code: "fr", label: "Français" },
                  ].map(({ code, label }) => (
                    <button
                      key={code}
                      className={`lt-lang-picker__item${language === code ? " lt-lang-picker__item--active" : ""}`}
                      onClick={() => { handleLanguageChange(code); setShowLangPicker(false); }}
                    >
                      <span className="lt-lang-picker__code">{code.toUpperCase()}</span>
                      <span className="lt-lang-picker__label">{label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              className="lt-header__hint"
              onClick={() => setShowHints(true)}
              title="Keyboard Shortcuts anzeigen (?)"
            >
              ?
            </button>
          </div>
        </header>

          {match && (
            <MatchHeader
              match={match}
              leagueSeason={curCompetition}
              onMinuteSync={reload.loadMatch}
            />
          )}
          {match && <ModeSelector mode={mode} onModeChange={handleModeChange} />}
        </div>{/* /lt-top-bar */}

        <main
          className={`lt-columns${mode === "auto" ? " lt-columns--auto" : ""}`}
          style={{
            gridTemplateColumns:
              mode === "auto"
                ? `1fr ${rightW}px`
                : `${centerW}px 1fr ${rightW}px`,
          }}
        >
          {mode !== "auto" && (
            <div className={`lt-panel-wrap${mobilePanel === "center" ? " lt-panel-wrap--active" : ""}`}>
              <div
                onMouseDown={handleCenterResizeMouseDown}
                title="Breite ziehen"
                style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 6, cursor: "col-resize", zIndex: 20, background: "transparent" }}
              />
              <ErrorBoundary>
                <CenterPanel
                  match={match}
                  currentMinute={liveMinute}
                  events={events}
                  tickerTexts={tickerTexts}
                  generatingId={generatingId}
                  onGenerate={handleGenerate}
                  onManualPublish={handleManualPublish}
                  onDraftActive={handleDraftActive}
                  onPublished={showPublishToast}
                  reload={reload}
                  instance={instance}
                  lineups={lineups}
                  players={players}
                />
              </ErrorBoundary>
            </div>
          )}
          <div className={`lt-panel-wrap lt-panel-wrap--left${mobilePanel === "left" ? " lt-panel-wrap--active" : ""}`}>
            <ErrorBoundary>
              <LeftPanel
                events={events}
                tickerTexts={tickerTexts}
                match={match}
                onEditEntry={handleEditEntry}
                onDeleteEntry={handleDeleteEntry}
              />
            </ErrorBoundary>
          </div>
          <div className={`lt-panel-wrap${mobilePanel === "right" ? " lt-panel-wrap--active" : ""}`}>
            <div
              onMouseDown={handleResizeMouseDown}
              title="Breite ziehen"
              style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 6, cursor: "col-resize", zIndex: 20, background: "transparent" }}
            />
            <ErrorBoundary>
              <RightPanel
                match={match}
                matchStats={matchStats}
                players={players}
                playerStats={playerStats}
                lineups={lineups}
                prematch={prematch}
                events={events}
                injuries={injuries}
              />
            </ErrorBoundary>
          </div>
        </main>

        {/* Mobile Bottom Tab Bar */}
        <nav className="lt-mobile-tabs">
          {mode !== "auto" && (
            <button
              className={`lt-mobile-tab${mobilePanel === "center" ? " lt-mobile-tab--active" : ""}`}
              onClick={() => setMobilePanel("center")}
            >
              <span>✏️</span>
              <span>Editor</span>
            </button>
          )}
          <button
            className={`lt-mobile-tab${mobilePanel === "left" ? " lt-mobile-tab--active" : ""}`}
            onClick={() => setMobilePanel("left")}
          >
            <span>📋</span>
            <span>Ticker</span>
          </button>
          <button
            className={`lt-mobile-tab${mobilePanel === "right" ? " lt-mobile-tab--active" : ""}`}
            onClick={() => setMobilePanel("right")}
          >
            <span>📊</span>
            <span>Stats</span>
          </button>
        </nav>

        <NavDrawer open={modalOpen} onClose={() => setModalOpen(false)} navProps={navProps} />

        {showHints && <KeyboardHints mode={mode} onClose={() => setShowHints(false)} />}
        {showCommands && <CommandsModal onClose={() => setShowCommands(false)} />}
        {publishToast && (
          <PublishToast
            entryId={publishToast.id}
            text={publishToast.text}
            onRetract={handleRetract}
            onDismiss={() => setPublishToast(null)}
          />
        )}
      </div>
    </TickerModeContext.Provider>
  );
}
