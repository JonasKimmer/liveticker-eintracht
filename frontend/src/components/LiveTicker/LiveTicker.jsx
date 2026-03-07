// ============================================================
// LiveTicker.jsx — Hauptkomponente
// Neu: 2-Zustands-UI
//   Zustand 1 (selMatchId === null) → StartScreen
//   Zustand 2 (selMatchId gesetzt)  → 3-Spalten + Breadcrumb + Modal
// Alle Nav-Hooks + api-Calls bleiben identisch.
// ============================================================
import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import "./LiveTicker.css";

import * as api from "../../api";
import { useMatchData } from "../../hooks/useMatchData";
import { usePollingMatchdays } from "../../hooks/usePollingMatchdays";
import { useTickerMode } from "../../hooks/useTickerMode";
import { TickerModeContext } from "../../context/TickerModeContext";
import config from "../../config/whitelabel";

import { POLL_LIVE_MS } from "./constants";
import { LoadingScreen } from "./components/LoadingScreen";
import { MatchHeader } from "./components/MatchHeader";
import { ModeSelector } from "./components/ModeSelector";
import { KeyboardHints } from "./components/KeyboardHints";
import { LeftPanel } from "./panels/LeftPanel";
import { CenterPanel } from "./panels/CenterPanel";
import { RightPanel } from "./panels/RightPanel";

// Neue Komponenten
import { StartScreen } from "./components/StartScreen";
import { MatchSelectorModal } from "./components/MatchSelectorModal";
import { Breadcrumb } from "./components/Breadcrumb";

export default function LiveTicker() {
  // ── App Loading ───────────────────────────────────────────
  const [appLoading, setAppLoading] = useState(true);

  // ── UI State (neu) ────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [showHints, setShowHints] = useState(false);

  // ── Navigation State (unverändert) ────────────────────────
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
  const [favorites, setFavorites] = useState([]);

  // ── Match-Daten (unverändert) ─────────────────────────────
  const {
    match,
    events,
    tickerTexts,
    prematch,
    lineups,
    matchStats,
    playerStats,
    reload,
  } = useMatchData(selMatchId);

  // ── Aktiver Draft (unverändert) ───────────────────────────
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
      console.error("acceptDraft error:", err);
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
      console.error("rejectDraft error:", err);
    }
  }, [activeDraftId, reload]);

  const { mode, setMode } = useTickerMode(acceptDraft, rejectDraft);
  const [generatingId, setGeneratingId] = useState(null);

  const tickerModeCtx = useMemo(
    () => ({ mode, setMode, acceptDraft, rejectDraft }),
    [mode, setMode, acceptDraft, rejectDraft],
  );

  // ── Instance (Vereinsstil) ────────────────────────────────
  const [instance, setInstance] = useState("ef_whitelabel");

  // ── Import-Loading States ─────────────────────────────────
  const [importingTeams, setImportingTeams] = useState(false);
  const [importingCompetitions, setImportingCompetitions] = useState(false);

  // ── Events Auto-Import ───────────────────────────────────
  useEffect(() => {
    if (!selMatchId || !match?.externalId || events.length > 0) return;
    api.importEvents(match.externalId)
      .then(() => reload.loadEvents())
      .catch((err) => console.error("importEvents error:", err));
  }, [selMatchId, match?.externalId, events.length]);

  // ── Lineup Auto-Import ────────────────────────────────────
  useEffect(() => {
    if (!selMatchId || lineups.length > 0) return;
    api.importLineups(selMatchId)
      .then(() => reload.loadLineups())
      .catch((err) => console.error("importLineups error:", err));
  }, [selMatchId, lineups.length]);

  // ── Match-Stats Auto-Import ───────────────────────────────
  useEffect(() => {
    if (!selMatchId || matchStats.length > 0) return;
    api.importMatchStats(selMatchId)
      .then(() => reload.loadMatchStats())
      .catch((err) => console.error("importMatchStats error:", err));
  }, [selMatchId, matchStats.length]);

  // ── Pre-Match Auto-Import ─────────────────────────────────
  // Nutzt useRef, da fetchPrematch denselben Endpunkt wie fetchTickerTexts
  // aufruft – prematch.length wäre nie 0 wenn Ticker-Texte vorhanden sind.
  const prematchImportedRef = useRef(null);
  useEffect(() => {
    if (!selMatchId || !match?.externalId) return;
    if (prematchImportedRef.current === selMatchId) return;
    prematchImportedRef.current = selMatchId;
    api.importPrematch(match.externalId)
      .then(() => reload.loadPrematch())
      .catch((err) => console.error("importPrematch error:", err));
  }, [selMatchId, match?.externalId]);

  // ── Init ──────────────────────────────────────────────────
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      api.fetchCountries().then(async (r) => {
        if (controller.signal.aborted) return;
        if (r.data.length === 0) {
          // Einmalig: alle Länder von Football API importieren
          try {
            await api.importCountries();
            const r2 = await api.fetchCountries();
            if (!controller.signal.aborted) {
              setCountries(r2.data);
              if (r2.data.length > 0) setSelCountry(r2.data[0]);
            }
          } catch (err) {
            console.error("importCountries error:", err);
          }
        } else {
          setCountries(r.data);
          if (r.data.length > 0) setSelCountry(r.data[0]);
        }
      }),
      api.fetchFavorites().then((r) => setFavorites(r.data)),
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
          // Teams nicht in DB → per n8n von Football API importieren
          setImportingTeams(true);
          try {
            await api.importTeamsByCountry(selCountry, new Date().getFullYear());
            const r2 = await api.fetchTeamsByCountry(selCountry);
            if (!controller.signal.aborted) {
              setTeams(r2.data);
              if (r2.data.length > 0) setSelTeamId(r2.data[0].id);
            }
          } catch (err) {
            console.error("importTeamsByCountry error:", err);
          } finally {
            if (!controller.signal.aborted) setImportingTeams(false);
          }
        } else {
          setTeams(r.data);
          if (r.data.length > 0) setSelTeamId(r.data[0].id);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) console.error(err);
      });
    return () => controller.abort();
  }, [selCountry]);

  // ── Team → Competitions ───────────────────────────────────
  useEffect(() => {
    if (!selTeamId) return;
    const controller = new AbortController();
    setCompetitions([]);
    setMatches([]);
    setSelCompetitionId(null);
    setSelRound(null);
    setSelMatchId(null);
    api
      .fetchTeamCompetitions(selTeamId)
      .then(async (r) => {
        if (controller.signal.aborted) return;
        if (r.data.length === 0) {
          // Competitions/Matches nicht in DB → per n8n importieren
          // externalId = Football API Team-ID (z.B. 169), nicht interne DB-ID
          const team = teams.find((t) => t.id === selTeamId);
          const apiTeamId = team?.externalId ?? selTeamId;
          setImportingCompetitions(true);
          try {
            await api.importCompetitionsForTeam(apiTeamId, new Date().getFullYear());
            const r2 = await api.fetchTeamCompetitions(selTeamId);
            if (!controller.signal.aborted) {
              setCompetitions(r2.data);
              if (r2.data.length > 0) setSelCompetitionId(r2.data[0].id);
            }
          } catch (err) {
            console.error("importCompetitionsForTeam error:", err);
          } finally {
            if (!controller.signal.aborted) setImportingCompetitions(false);
          }
        } else {
          setCompetitions(r.data);
          if (r.data.length > 0) setSelCompetitionId(r.data[0].id);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) console.error(err);
      });
    return () => controller.abort();
  }, [selTeamId]);

  // ── Competition → Reset (unverändert) ─────────────────────
  useEffect(() => {
    if (!selCompetitionId) return;
    setMatches([]);
    setSelRound(null);
    setSelMatchId(null);
  }, [selCompetitionId]);

  // ── Matchdays → letzten vorauswählen (unverändert) ────────
  useEffect(() => {
    if (matchdays.length > 0) setSelRound(matchdays[matchdays.length - 1]);
  }, [matchdays]);

  // ── Spieltag → Matches (unverändert) ─────────────────────
  useEffect(() => {
    if (!selTeamId || !selCompetitionId || !selRound) return;
    const controller = new AbortController();
    setMatches([]);
    setSelMatchId(null);
    api
      .fetchTeamMatchesByMatchday(selTeamId, selCompetitionId, selRound)
      .then((r) => {
        if (controller.signal.aborted) return;
        setMatches(r.data);
        // Kein Auto-Select mehr: User soll bewusst wählen (StartScreen / Modal)
      })
      .catch((err) => {
        if (!controller.signal.aborted) console.error(err);
      });
    return () => controller.abort();
  }, [selTeamId, selCompetitionId, selRound]);

  // ── Live-Tab Polling (unverändert) ────────────────────────
  const liveIntervalRef = useRef(null);

  const handleTabMatches = useCallback(async (tab) => {
    setActiveTab(tab);
    clearInterval(liveIntervalRef.current);
    const load = async () => {
      try {
        let res;
        if (tab === "heute") res = await api.fetchTodayMatches();
        else if (tab === "live") res = await api.fetchLiveMatches();
        else if (tab === "favoriten") res = await api.fetchFavoriteMatches();
        if (res) setMatches(res.data);
      } catch (err) {
        console.error("handleTabMatches load error:", err);
      }
    };
    await load();
    if (tab === "live")
      liveIntervalRef.current = setInterval(load, POLL_LIVE_MS);
  }, []);

  useEffect(() => () => clearInterval(liveIntervalRef.current), []);

  const handleTabChange = useCallback(
    (tab) => {
      if (tab === "teams") {
        setActiveTab("teams");
        return;
      }
      handleTabMatches(tab);
    },
    [handleTabMatches],
  );

  // ── Favoriten (unverändert) ───────────────────────────────
  const toggleFav = useCallback(
    async (teamId) => {
      const isFav = favorites.some((f) => f.team_id === teamId);
      try {
        if (isFav) await api.removeFavorite(teamId);
        else await api.addFavorite(teamId);
        const r = await api.fetchFavorites();
        setFavorites(r.data);
      } catch (err) {
        console.error("toggleFav error:", err);
      }
    },
    [favorites],
  );

  // ── Ticker generieren ─────────────────────────────────────
  const handleGenerate = useCallback(
    async (eventId, style) => {
      setGeneratingId(eventId);
      try {
        await api.generateTicker(eventId, style, instance);
        await reload.loadTickerTexts();
      } catch (err) {
        console.error("generateTicker error:", err);
      } finally {
        setGeneratingId(null);
      }
    },
    [reload, instance],
  );

  // ── Manueller Eintrag (unverändert) ───────────────────────
  const handleManualPublish = useCallback(
    async (text, icon = "📝", minute) => {
      try {
        await api.createManualTicker(selMatchId, text, icon, minute);
        await reload.loadTickerTexts();
      } catch (err) {
        console.error("manualPublish error:", err);
      }
    },
    [selMatchId, reload],
  );

  // ── Keyboard: ? → Hints ───────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) setShowHints((s) => !s);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── Shared Nav Props (für StartScreen + Modal) ────────────
  const navProps = {
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
  };

  const curCompetition = competitions.find((c) => c.id === selCompetitionId);
  const isMatchLive = match
    ? ["1H", "2H", "HT", "ET", "live"].includes(match.status)
    : false;

  // ── Render ────────────────────────────────────────────────
  if (appLoading) return <LoadingScreen />;

  // Zustand 1: Kein Match ausgewählt
  if (!selMatchId) {
    return (
      <div className="lt">
        <StartScreen {...navProps} />
      </div>
    );
  }

  // Zustand 2: Match aktiv
  return (
    <TickerModeContext.Provider value={tickerModeCtx}>
      <div className="lt">
        {/* Header */}
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
            onOpen={() => setModalOpen(true)}
          />

          <div className="lt-header__status">
            <div
              className={`lt-header__dot${isMatchLive ? " lt-header__dot--live" : ""}`}
            />
            <span>API: {isMatchLive ? "Live" : "Bereit"}</span>
            <button
              className={`lt-header__hint${instance === "ef_whitelabel" ? " lt-header__hint--active" : ""}`}
              onClick={() => setInstance(i => i === "ef_whitelabel" ? "generic" : "ef_whitelabel")}
              title={instance === "ef_whitelabel" ? "EF-Stil aktiv – klicken für neutral" : "Neutraler Stil aktiv – klicken für EF-Stil"}
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

        {/* Match Header + Mode Selector */}
        {match && (
          <MatchHeader
            match={match}
            leagueSeason={curCompetition}
            favorites={favorites}
            onToggleFav={toggleFav}
          />
        )}
        {match && <ModeSelector mode={mode} onModeChange={setMode} />}

        {/* Layout: [Events] | Ticker | Stats — Auto-Modus: ohne Events-Spalte */}
        <main className={`lt-columns${mode === "auto" ? " lt-columns--auto" : ""}`}>
          {mode !== "auto" && (
            <CenterPanel
              match={match}
              events={events}
              tickerTexts={tickerTexts}
              generatingId={generatingId}
              onGenerate={handleGenerate}
              onManualPublish={handleManualPublish}
              onDraftActive={(id, text) => {
                setActiveDraftId(id);
                setActiveDraftText(text);
              }}
              reload={reload}
              instance={instance}
            />
          )}
          <LeftPanel
            events={events}
            tickerTexts={tickerTexts}
            match={match}
          />
          <RightPanel
            match={match}
            matchStats={matchStats}
            playerStats={playerStats}
            lineups={lineups}
            prematch={prematch}
          />
        </main>

        {/* Match Selector Modal */}
        {modalOpen && (
          <MatchSelectorModal
            {...navProps}
            onClose={() => setModalOpen(false)}
            activeTab={activeTab}
            onTabChange={(tab) => {
              handleTabChange(tab); // lädt Matches für heute/live/favoriten
            }}
          />
        )}

        {/* Keyboard Hints */}
        {showHints && (
          <KeyboardHints mode={mode} onClose={() => setShowHints(false)} />
        )}
      </div>
    </TickerModeContext.Provider>
  );
}
