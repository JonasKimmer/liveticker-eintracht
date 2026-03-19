// ============================================================
// LiveTicker.jsx — Hauptkomponente
// ============================================================
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import "./LiveTicker.css";
import logger from "../../utils/logger";

import * as api from "../../api";
import { useMatchData } from "../../hooks/useMatchData";
import { useLiveMinute } from "../../hooks/useLiveMinute";
import { usePollingMatchdays } from "../../hooks/usePollingMatchdays";
import { useTickerMode } from "../../hooks/useTickerMode";
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
import { useApiStatus, API_STATUS_CFG } from "../../hooks/useApiStatus";
import { useMatchTriggers } from "../../hooks/useMatchTriggers";
import ErrorBoundary from "../ErrorBoundary";

const PANEL_RIGHT_MIN = 280;
const PANEL_RIGHT_MAX = 700;
const PANEL_CENTER_MIN = 240;
const PANEL_CENTER_MAX = 600;

const CURRENT_YEAR = new Date().getFullYear();

export default function LiveTicker() {
  // ── App Loading ───────────────────────────────────────────
  const [appLoading, setAppLoading] = useState(true);

  // ── UI State ──────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const [mobilePanel, setMobilePanel] = useState("center"); // "left"|"center"|"right"

  // ── Resizable Panels ──────────────────────────────────────
  const [rightW, setRightW] = useState(380);
  const [centerW, setCenterW] = useState(320);
  const draggingPanel = useRef(null);
  const dragStartX = useRef(0);
  const dragStartW = useRef(0);

  const handleResizeMouseDown = useCallback(
    (e) => {
      draggingPanel.current = "right";
      dragStartX.current = e.clientX;
      dragStartW.current = rightW;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [rightW],
  );

  const handleCenterResizeMouseDown = useCallback(
    (e) => {
      draggingPanel.current = "center";
      dragStartX.current = e.clientX;
      dragStartW.current = centerW;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [centerW],
  );

  useEffect(() => {
    const onMove = (e) => {
      if (!draggingPanel.current) return;
      const delta = e.clientX - dragStartX.current;
      if (draggingPanel.current === "right") {
        setRightW(Math.min(PANEL_RIGHT_MAX, Math.max(PANEL_RIGHT_MIN, dragStartW.current - delta)));
      } else {
        setCenterW(Math.min(PANEL_CENTER_MAX, Math.max(PANEL_CENTER_MIN, dragStartW.current + delta)));
      }
    };
    const onUp = () => {
      if (!draggingPanel.current) return;
      draggingPanel.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  // ── Navigation State ──────────────────────────────────────
  const [activeTab, setActiveTab] = useState("teams");
  const [countries, setCountries] = useState([]);
  const [selCountry, setSelCountry] = useState(null);
  const [teams, setTeams] = useState([]);
  const [selTeamId, setSelTeamId] = useState(null);
  const [competitions, setCompetitions] = useState([]);
  const [selCompetitionId, setSelCompetitionId] = useState(null);

  const {
    matchdays,
    loading: matchdaysLoading,
    error: matchdaysError,
  } = usePollingMatchdays(selTeamId, selCompetitionId);

  const [selRound, setSelRound] = useState(null);
  const [matches, setMatches] = useState([]);
  const [selMatchId, setSelMatchId] = useState(null);

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
  const apiCfg    = API_STATUS_CFG[apiStatus];

  // ── Aktiver Draft ─────────────────────────────────────────
  const [activeDraftId, setActiveDraftId] = useState(null);
  const [activeDraftText, setActiveDraftText] = useState("");

  const acceptDraft = useCallback(async () => {
    if (!activeDraftId) return;
    try {
      await api.publishTicker(activeDraftId, activeDraftText);
      await reload.loadTickerTexts();
      setActiveDraftId(null);
      setActiveDraftText("");
    } catch (err) {
      logger.error("acceptDraft error:", err);
    }
  }, [activeDraftId, activeDraftText, reload]);

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
  const [generatingId, setGeneratingId] = useState(null);

  // ── Mobile Panel: Modus-abhängig wechseln ─────────────────
  useEffect(() => {
    if (mode === "auto") setMobilePanel("left");
    else setMobilePanel("center");
  }, [mode]);

  const tickerModeCtx = useMemo(
    () => ({ mode, setMode, acceptDraft, rejectDraft }),
    [mode, setMode, acceptDraft, rejectDraft],
  );

  // ── Instance ──────────────────────────────────────────────
  const [instance, setInstance] = useState("ef_whitelabel");

  // ── Import-Loading States ─────────────────────────────────
  const [importingTeams, setImportingTeams] = useState(false);
  const [importingCompetitions, setImportingCompetitions] = useState(false);

  // ── n8n Webhooks + Auto-Imports (ausgelagert in useMatchTriggers) ────────
  useMatchTriggers({ selMatchId, match, events, lineups, matchStats, tickerTexts, instance, reload });

  // ── Init ──────────────────────────────────────────────────
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      api.fetchCountries().then(async (r) => {
        if (controller.signal.aborted) return;
        if (r.data.length === 0) {
          try {
            await api.importCountries();
            const r2 = await api.fetchCountries();
            if (!controller.signal.aborted) {
              setCountries(r2.data);
              if (r2.data.length > 0) setSelCountry(r2.data[0]);
            }
          } catch (err) {
            logger.error("importCountries error:", err);
          }
        } else {
          setCountries(r.data);
          if (r.data.length > 0) setSelCountry(r.data[0]);
        }
      }),
    ]).finally(() => {
      if (!controller.signal.aborted) setAppLoading(false);
    });
    return () => controller.abort();
  }, []);

  // ── Land → Teams ──────────────────────────────────────────
  useEffect(() => {
    if (!selCountry) return;
    const controller = new AbortController();
    setTeams([]);
    setSelTeamId(null);
    api
      .fetchTeamsByCountry(selCountry)
      .then(async (r) => {
        if (controller.signal.aborted) return;
        if (r.data.length === 0) {
          setImportingTeams(true);
          try {
            await api.importTeamsByCountry(
              selCountry,
              new Date().getFullYear(),
            );
            const r2 = await api.fetchTeamsByCountry(selCountry);
            if (!controller.signal.aborted) {
              setTeams(r2.data);
            }
          } catch (err) {
            logger.error("importTeamsByCountry error:", err);
          } finally {
            if (!controller.signal.aborted) setImportingTeams(false);
          }
        } else {
          setTeams(r.data);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) logger.error(err);
      });
    return () => controller.abort();
  }, [selCountry]);

  // ── Team → Competitions + Matches importieren ─────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!selTeamId) return;
    const controller = new AbortController();
    setCompetitions([]);
    setMatches([]);
    setSelCompetitionId(null);
    setSelRound(null);

    const team = teams.find((t) => t.id === selTeamId);
    const apiTeamId = team?.externalId ?? selTeamId;

    api
      .fetchTeamCompetitions(selTeamId)
      .then(async (r) => {
        if (controller.signal.aborted) return;
        setImportingCompetitions(true);
        try {
          // 1. Competitions immer importieren (holt ggf. neue dazu)
          await api.importCompetitionsForTeam(apiTeamId, CURRENT_YEAR);
          const r2 = await api.fetchTeamCompetitions(selTeamId);
          let competitions = r2.data.length > 0 ? r2.data : r.data;
          if (!controller.signal.aborted) {
            setCompetitions(competitions);
            // 2. Matches immer importieren
            await Promise.all(
              competitions
                .filter((c) => c.externalId)
                .map((c) =>
                  api
                    .importMatchesForTeam(apiTeamId, c.externalId, CURRENT_YEAR)
                    .catch((err) =>
                      logger.error(
                        `importMatchesForTeam error (league ${c.externalId}):`,
                        err,
                      ),
                    ),
                ),
            );
          }
        } catch (err) {
          logger.error("importCompetitionsForTeam error:", err);
        } finally {
          if (!controller.signal.aborted) setImportingCompetitions(false);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) logger.error(err);
      });
    return () => controller.abort();
  }, [selTeamId]);

  // ── Competition → Reset ───────────────────────────────────
  useEffect(() => {
    if (!selCompetitionId) return;
    setMatches([]);
    setSelRound(null);
  }, [selCompetitionId]);

  // ── Matchdays → letzten vorauswählen (nur wenn noch kein Round gesetzt) ──
  useEffect(() => {
    if (matchdays.length > 0 && selRound == null) setSelRound(matchdays[matchdays.length - 1]);
  }, [matchdays, selRound]);

  // ── Spieltag → Matches ────────────────────────────────────
  useEffect(() => {
    if (!selTeamId || !selCompetitionId || !selRound) return;
    const controller = new AbortController();
    setMatches([]);
    api
      .fetchTeamMatchesByMatchday(selTeamId, selCompetitionId, selRound)
      .then((r) => {
        if (controller.signal.aborted) return;
        setMatches(r.data);
      })
      .catch((err) => {
        if (!controller.signal.aborted) logger.error(err);
      });
    return () => controller.abort();
  }, [selTeamId, selCompetitionId, selRound]);

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
  }, []);

  // ── Ticker generieren ─────────────────────────────────────
  const handleGenerate = useCallback(
    async (eventId, style) => {
      setGeneratingId(eventId);
      try {
        await api.generateTicker(eventId, style, instance);
        await reload.loadTickerTexts();
      } catch (err) {
        logger.error("generateTicker error:", err);
      } finally {
        setGeneratingId(null);
      }
    },
    [reload, instance],
  );

  // ── Manueller Eintrag ─────────────────────────────────────
  const handleManualPublish = useCallback(
    async (text, icon = "📝", minute, phase) => {
      try {
        await api.createManualTicker(selMatchId, text, icon, minute, phase);
        await reload.loadTickerTexts();
      } catch (err) {
        logger.error("manualPublish error:", err);
      }
    },
    [selMatchId, reload],
  );

  // ── Keyboard: ? → Hints ───────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      const tag = e.target?.tagName;
      if (e.key === "?" && !e.ctrlKey && !e.metaKey && tag !== "TEXTAREA" && tag !== "INPUT") setShowHints((s) => !s);
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

  // ── Shared Nav Props ──────────────────────────────────────
  const navProps = useMemo(() => ({
    countries,
    selCountry,
    onCountryChange: setSelCountry,
    teams,
    teamsLoading: importingTeams,
    selTeamId,
    onTeamChange: setSelTeamId,
    competitions,
    competitionsLoading: importingCompetitions,
    selCompetitionId,
    onCompetitionChange: setSelCompetitionId,
    matchdays,
    matchdaysLoading,
    matchdaysError,
    selRound,
    onRoundChange: setSelRound,
    matches,
    selMatchId,
    onMatchChange: setSelMatchId,
  }), [countries, selCountry, teams, importingTeams, selTeamId, competitions,
       importingCompetitions, selCompetitionId, matchdays, matchdaysLoading,
       matchdaysError, selRound, matches, selMatchId]);

  const curCompetition = useMemo(
    () => competitions.find((c) => c.id === selCompetitionId),
    [competitions, selCompetitionId],
  );

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
            country={selCountry}
            team={teams.find((t) => t.id === selTeamId)}
            round={selRound}
            onOpen={() => setModalOpen(true)}
          />
          <div className="lt-header__status">
            {NAV_TABS.filter((t) => t.id !== "teams").map(({ id, label }) => (
              <button
                key={id}
                className={`lt-header__nav-tab${activeTab === id ? " lt-header__nav-tab--active" : ""}`}
                onClick={() => { handleTabChange(id); setModalOpen(true); }}
              >
                {label}
              </button>
            ))}
            <span className="lt-header__sep">|</span>
            <div className="lt-header__dot" style={{ background: apiCfg.dot }} />
            <span>Backend: {apiCfg.label}</span>
            <button
              className={`lt-header__hint${instance === "ef_whitelabel" ? " lt-header__hint--active" : ""}`}
              onClick={() =>
                setInstance((i) =>
                  i === "ef_whitelabel" ? "generic" : "ef_whitelabel",
                )
              }
              title={
                instance === "ef_whitelabel"
                  ? "EF-Stil aktiv – klicken für neutral"
                  : "Neutraler Stil aktiv – klicken für EF-Stil"
              }
            >
              {instance === "ef_whitelabel" ? "EF" : "⬜"}
            </button>
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
        {match && <ModeSelector mode={mode} onModeChange={setMode} />}

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
                  match={match}
                  currentMinute={liveMinute}
                  events={events}
                  tickerTexts={tickerTexts}
                  generatingId={generatingId}
                  onGenerate={handleGenerate}
                  onManualPublish={handleManualPublish}
                  onDraftActive={handleDraftActive}
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

        {/* Drawer Overlay */}
        <div
          onClick={() => setModalOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)",
            opacity: modalOpen ? 1 : 0,
            pointerEvents: modalOpen ? "auto" : "none",
            transition: "opacity 0.25s ease",
          }}
        />
        {/* Drawer Panel */}
        <div style={{
          position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 101,
          width: "min(420px, 100vw)",
          background: "var(--lt-bg-card)",
          borderLeft: "1px solid var(--lt-border)",
          boxShadow: "-12px 0 40px rgba(0,0,0,0.5)",
          transform: modalOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.28s cubic-bezier(0.32,0,0.24,1)",
          overflowY: "auto",
          display: "flex", flexDirection: "column",
        }}>
          {/* Drawer Header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "1rem 1.25rem",
            borderBottom: "1px solid var(--lt-border)",
            flexShrink: 0,
          }}>
            <span style={{ fontFamily: "var(--lt-font-mono)", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--lt-text-muted)" }}>
              Match wechseln
            </span>
            <button
              onClick={() => setModalOpen(false)}
              style={{
                width: 30, height: 30, borderRadius: "50%",
                background: "var(--lt-bg-card-2)", border: "1px solid var(--lt-border)",
                color: "var(--lt-text-muted)", cursor: "pointer", fontSize: "0.85rem",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >✕</button>
          </div>
          {/* Drawer Content */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            <StartScreen
              {...navProps}
              compact
              onMatchChange={(id) => { navProps.onMatchChange(id); setModalOpen(false); }}
            />
          </div>
        </div>
        {showHints && (
          <KeyboardHints mode={mode} onClose={() => setShowHints(false)} />
        )}
        {showCommands && (
          <div
            style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={() => setShowCommands(false)}
          >
            <div
              style={{ background: "var(--lt-bg-card)", border: "1px solid var(--lt-border)", borderRadius: 12, padding: "1.5rem", maxWidth: 420, width: "90%", boxShadow: "0 24px 48px rgba(0,0,0,0.5)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ fontFamily: "var(--lt-font-mono)", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--lt-text-muted)", marginBottom: "1rem" }}>
                ⚡ Slash Commands
              </div>
              {[
                ["/goal Müller FCB", "⚽ TOR — Müller (FCB)"],
                ["/card Müller FCB yellow", "🟨 KARTE — Müller (FCB)"],
                ["/card Müller FCB red", "🟥 ROTE KARTE — Müller (FCB)"],
                ["/sub Kimmich Coman FCB", "🔄 WECHSEL — Kimmich ↔ Coman (FCB)"],
                ["/note Ecke für FCB", "— Ecke für FCB"],
              ].map(([cmd, result]) => (
                <div key={cmd} style={{ marginBottom: "0.75rem" }}>
                  <code style={{ fontFamily: "var(--lt-font-mono)", fontSize: "0.82rem", color: "var(--lt-accent)", background: "var(--lt-accent-dim)", padding: "2px 6px", borderRadius: 4 }}>{cmd}</code>
                  <div style={{ fontFamily: "var(--lt-font-mono)", fontSize: "0.75rem", color: "var(--lt-text-muted)", marginTop: "0.2rem" }}>→ {result}</div>
                </div>
              ))}
              <button
                onClick={() => setShowCommands(false)}
                style={{ marginTop: "0.5rem", width: "100%", padding: "0.5rem", background: "var(--lt-bg-card-2)", border: "1px solid var(--lt-border)", borderRadius: 6, color: "var(--lt-text-muted)", fontFamily: "var(--lt-font-mono)", fontSize: "0.75rem", cursor: "pointer" }}
              >
                Schließen
              </button>
            </div>
          </div>
        )}
      </div>
    </TickerModeContext.Provider>
  );
}
