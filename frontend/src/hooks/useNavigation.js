/**
 * useNavigation
 * =============
 * Kapselt den gesamten Navigation-State (Länder → Teams → Wettbewerbe →
 * Spieltage → Spiele) inkl. aller Lade-Effekte und Auto-Imports.
 *
 * Gibt navProps (für StartScreen / Drawer) und selMatchId zurück.
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import * as api from "../api";
import logger from "../utils/logger";
import { usePollingMatchdays } from "./usePollingMatchdays";

const CURRENT_YEAR = new Date().getFullYear();

export function useNavigation() {
  const [appLoading, setAppLoading] = useState(true);

  const [countries, setCountries] = useState([]);
  const [selCountry, setSelCountry] = useState(null);

  const [teams, setTeams] = useState([]);
  const [selTeamId, setSelTeamId] = useState(null);
  const [importingTeams, setImportingTeams] = useState(false);

  const [competitions, setCompetitions] = useState([]);
  const [selCompetitionId, setSelCompetitionId] = useState(null);
  const [importingCompetitions, setImportingCompetitions] = useState(false);

  const {
    matchdays,
    loading: matchdaysLoading,
    error: matchdaysError,
  } = usePollingMatchdays(selTeamId, selCompetitionId);

  const [selRound, setSelRound] = useState(null);
  const [matches, setMatches] = useState([]);
  const [selMatchId, setSelMatchId] = useState(null);

  // ── Init: Länder laden ──────────────────────────────────────
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

  // ── Land → Teams ────────────────────────────────────────────
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
            await api.importTeamsByCountry(selCountry, CURRENT_YEAR);
            const r2 = await api.fetchTeamsByCountry(selCountry);
            if (!controller.signal.aborted) setTeams(r2.data);
          } catch (err) {
            logger.error("importTeamsByCountry error:", err);
          } finally {
            if (!controller.signal.aborted) setImportingTeams(false);
          }
        } else {
          setTeams(r.data);
        }
      })
      .catch((err) => { if (!controller.signal.aborted) logger.error(err); });
    return () => controller.abort();
  }, [selCountry]);

  // ── Team → Competitions + Matches importieren ───────────────
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
          await api.importCompetitionsForTeam(apiTeamId, CURRENT_YEAR);
          const r2 = await api.fetchTeamCompetitions(selTeamId);
          const comps = r2.data.length > 0 ? r2.data : r.data;
          if (!controller.signal.aborted) {
            setCompetitions(comps);
            await Promise.all(
              comps
                .filter((c) => c.externalId)
                .map((c) =>
                  api
                    .importMatchesForTeam(apiTeamId, c.externalId, CURRENT_YEAR)
                    .catch((err) =>
                      logger.error(`importMatchesForTeam error (league ${c.externalId}):`, err),
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
      .catch((err) => { if (!controller.signal.aborted) logger.error(err); });
    return () => controller.abort();
  }, [selTeamId]);

  // ── Competition → Reset ─────────────────────────────────────
  useEffect(() => {
    if (!selCompetitionId) return;
    setMatches([]);
    setSelRound(null);
  }, [selCompetitionId]);

  // ── Matchdays → letzten vorauswählen ────────────────────────
  useEffect(() => {
    if (matchdays.length > 0 && selRound == null) setSelRound(matchdays[matchdays.length - 1]);
  }, [matchdays, selRound]);

  // ── Spieltag → Matches ──────────────────────────────────────
  useEffect(() => {
    if (!selTeamId || !selCompetitionId || !selRound) return;
    const controller = new AbortController();
    setMatches([]);
    api
      .fetchTeamMatchesByMatchday(selTeamId, selCompetitionId, selRound)
      .then((r) => { if (!controller.signal.aborted) setMatches(r.data); })
      .catch((err) => { if (!controller.signal.aborted) logger.error(err); });
    return () => controller.abort();
  }, [selTeamId, selCompetitionId, selRound]);

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
  }), [
    countries, selCountry, teams, importingTeams, selTeamId,
    competitions, importingCompetitions, selCompetitionId,
    matchdays, matchdaysLoading, matchdaysError,
    selRound, matches, selMatchId,
  ]);

  const curCompetition = useMemo(
    () => competitions.find((c) => c.id === selCompetitionId),
    [competitions, selCompetitionId],
  );

  const handleTabChange = useCallback((tab, setActiveTab) => setActiveTab(tab), []);

  return {
    appLoading,
    navProps,
    selMatchId,
    setSelMatchId,
    selTeamId,
    teams,
    selCompetitionId,
    curCompetition,
    handleTabChange,
  };
}
