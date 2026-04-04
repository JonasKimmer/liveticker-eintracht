// ============================================================
// LiveTicker.jsx — Hauptkomponente
// ============================================================
import {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import "./LiveTicker.css";

import * as api from "../../api";
import { useMatchData } from "./hooks/useMatchData";
import { useLiveMinute } from "./hooks/useLiveMinute";
import { useNavigation } from "./hooks/useNavigation";
import { TickerModeContext } from "../../context/TickerModeContext";
import { TickerDataContext } from "../../context/TickerDataContext";
import { TickerActionsContext } from "../../context/TickerActionsContext";
import config from "../../config/whitelabel";

import { NAV_TABS, API_STATUS_CFG } from "./constants";
import { LoadingScreen } from "./components/LoadingScreen";
import { MatchHeader } from "./components/MatchHeader";
import { ModeSelector } from "./components/mode/ModeSelector";
import { KeyboardHints } from "./components/mode/KeyboardHints";
import { LeftPanel } from "./panels/LeftPanel";
import { CenterPanel } from "./panels/CenterPanel";
import { RightPanel } from "./panels/RightPanel";
import { StartScreen } from "./components/navigation/StartScreen";
import { Breadcrumb } from "./components/navigation/Breadcrumb";
import { NavDrawer } from "./components/navigation/NavDrawer";
import { LanguagePicker } from "./components/navigation/LanguagePicker";
import { useApiStatus } from "../../hooks/useApiStatus";
import { useIsMobile } from "../../hooks/useIsMobile";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useMatchTriggers } from "./hooks/useMatchTriggers";
import { usePanelResize } from "../../hooks/usePanelResize";
import { CommandsModal } from "./components/entry/CommandsModal";
import { PublishToast } from "./components/PublishToast";
import { useTicker } from "./hooks/useTicker";
import ErrorBoundary from "../ErrorBoundary";
import { isOurTeamMatch } from "../../utils/isOurTeamMatch";

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

  const isMobile = useIsMobile();

  // ── UI State ──────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const [mobilePanel, setMobilePanel] = useState("center");
  const [activeTab, setActiveTab] = useState("teams");

  // ── Resizable Panels ──────────────────────────────────────
  const {
    rightW,
    centerW,
    handleResizeMouseDown,
    handleCenterResizeMouseDown,
  } = usePanelResize();

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
  const apiStatus = useApiStatus();
  const apiCfg = API_STATUS_CFG[apiStatus];

  // ── Instance + Style: automatisch EF wenn Frankfurt-Spiel ──
  const isEfMatch = useMemo(
    () => isOurTeamMatch(match, config.teamKeyword ?? ""),
    [match],
  );
  const instance = isEfMatch ? "ef_whitelabel" : "generic";
  const efStyle = isEfMatch ? "euphorisch" : "neutral";

  // ── Language ───────────────────────────────────────────────
  const [language, setLanguage] = useState("de");
  const translateDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const handleLanguageChange = useCallback(
    (lang: string) => {
      setLanguage(lang);
      if (!selMatchId || lang === language) return;
      if (translateDebounceRef.current)
        clearTimeout(translateDebounceRef.current);
      translateDebounceRef.current = setTimeout(async () => {
        try {
          await api.translateTickerBatch(selMatchId, lang);
          await reload.loadTickerTexts();
        } catch (_) {}
      }, 600);
    },
    [selMatchId, language, reload],
  );

  // ── Ticker State + Actions ────────────────────────────────
  const {
    mode,
    handleModeChange,
    tickerModeCtx,
    tickerActionsCtx,
    generatingId,
    publishToast,
    setPublishToast,
    handleRetract,
    deleteToast,
  } = useTicker({
    selMatchId,
    reload,
    instance,
    language,
    matchTickerMode: match?.tickerMode,
  });

  // ── Mobile Panel: Modus-abhängig wechseln ─────────────────
  useEffect(() => {
    if (mode === "auto") setMobilePanel("left");
    else setMobilePanel("center");
  }, [mode]);

  const tickerDataCtx = useMemo(
    () => ({
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
      generatingId,
    }),
    [
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
      generatingId,
    ],
  );

  // ── n8n Webhooks + Auto-Imports ───────────────────────────
  useMatchTriggers({
    selMatchId,
    match,
    events,
    lineups,
    matchStats,
    tickerTexts,
    instance,
    style: efStyle,
    language,
    tickerMode: mode,
    reload,
  });

  // ── Keyboard Shortcuts ────────────────────────────────────
  useKeyboardShortcuts({
    onToggleHints: () => setShowHints((s) => !s),
    onShowHints: () => setShowHints(true),
    onShowCommands: () => setShowCommands(true),
  });

  const topBarRef = useRef<HTMLDivElement | null>(null);

  // Synchron vor Paint messen wenn Match sich ändert (MatchHeader/ModeBar erscheinen)
  useLayoutEffect(() => {
    const el = topBarRef.current;
    if (!el) return;
    document.documentElement.style.setProperty(
      "--lt-top-bar-h",
      `${el.getBoundingClientRect().height}px`,
    );
  }, [match]);

  // ResizeObserver für Orientierungswechsel + sonstige Größenänderungen
  useLayoutEffect(() => {
    const el = topBarRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      document.documentElement.style.setProperty(
        "--lt-top-bar-h",
        `${entry.contentRect.height}px`,
      );
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Render ────────────────────────────────────────────────
  if (appLoading) return <LoadingScreen />;

  if (!selMatchId) {
    return (
      <div className={`lt${isMobile ? " lt--mobile" : ""}`}>
        <StartScreen {...navProps} />
      </div>
    );
  }

  return (
    <TickerModeContext.Provider value={tickerModeCtx}>
      <TickerDataContext.Provider value={tickerDataCtx}>
        <TickerActionsContext.Provider value={tickerActionsCtx}>
          <div className={`lt${isMobile ? " lt--mobile" : ""}`}>
            <div
              className={`lt-top-bar${modalOpen ? " lt-top-bar--hidden" : ""}`}
              ref={topBarRef}
            >
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
                  {NAV_TABS.filter((t) => t.id !== "teams").map(
                    ({ id, label }) => (
                      <button
                        key={id}
                        className={`lt-header__nav-tab${activeTab === id ? " lt-header__nav-tab--active" : ""}`}
                        onClick={() => {
                          setActiveTab(id);
                          setModalOpen(true);
                        }}
                      >
                        {label}
                      </button>
                    ),
                  )}
                  <span className="lt-header__sep">|</span>
                  <div
                    className="lt-header__dot"
                    style={{ background: apiCfg.dot }}
                    title={`Backend: ${apiCfg.label}`}
                  />
                  {instance === "ef_whitelabel" && (
                    <span
                      className="lt-header__hint lt-header__hint--active"
                      title="EF-Schreibstil aktiv (Stilreferenzen aus DB)"
                    >
                      EF
                    </span>
                  )}
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
              {match && (
                <ModeSelector
                  mode={mode}
                  onModeChange={handleModeChange}
                  language={language}
                  onLanguageChange={handleLanguageChange}
                />
              )}
            </div>
            {/* /lt-top-bar */}

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
                <div
                  className={`lt-panel-wrap${mobilePanel === "center" ? " lt-panel-wrap--active" : ""}`}
                >
                  <div
                    onMouseDown={handleCenterResizeMouseDown}
                    title="Breite ziehen"
                    style={{
                      position: "absolute",
                      right: 0,
                      top: 0,
                      bottom: 0,
                      width: 6,
                      cursor: "col-resize",
                      zIndex: 20,
                      background: "transparent",
                    }}
                  />
                  <ErrorBoundary>
                    <CenterPanel
                      currentMinute={liveMinute}
                      instance={instance}
                      lineups={lineups}
                      players={players}
                      language={language}
                      tickerMode={mode}
                    />
                  </ErrorBoundary>
                </div>
              )}
              <div
                className={`lt-panel-wrap lt-panel-wrap--left${mobilePanel === "left" ? " lt-panel-wrap--active" : ""}`}
              >
                <ErrorBoundary>
                  <LeftPanel />
                </ErrorBoundary>
              </div>
              <div
                className={`lt-panel-wrap${mobilePanel === "right" ? " lt-panel-wrap--active" : ""}`}
              >
                <div
                  onMouseDown={handleResizeMouseDown}
                  title="Breite ziehen"
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 6,
                    cursor: "col-resize",
                    zIndex: 20,
                    background: "transparent",
                  }}
                />
                <ErrorBoundary>
                  <RightPanel />
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

            <NavDrawer
              open={modalOpen}
              onClose={() => setModalOpen(false)}
              navProps={navProps}
            />

            {showHints && (
              <KeyboardHints mode={mode} onClose={() => setShowHints(false)} />
            )}
            {showCommands && (
              <CommandsModal onClose={() => setShowCommands(false)} />
            )}
            {publishToast && (
              <PublishToast
                entryId={publishToast.id}
                text={publishToast.text}
                onRetract={handleRetract}
                onDismiss={() => setPublishToast(null)}
              />
            )}
            {deleteToast && (
              <div className="lt-delete-toast">
                <span className="lt-delete-toast__icon">✓</span>
                Eintrag gelöscht
              </div>
            )}
          </div>
        </TickerActionsContext.Provider>
      </TickerDataContext.Provider>
    </TickerModeContext.Provider>
  );
}
