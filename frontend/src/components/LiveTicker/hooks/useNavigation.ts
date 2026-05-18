/**
 * Kapselt den gesamten Navigation-State (Länder → Teams → Wettbewerbe →
 * Spieltage → Spiele) inkl. aller Lade-Effekte und Auto-Imports.
 *
 * @returns {{
 *   appLoading: boolean,
 *   navProps: object,
 *   selMatchId: number|null,
 *   setSelMatchId: Function,
 *   selTeamId: number|null,
 *   teams: Array,
 *   selCompetitionId: number|null,
 *   curCompetition: object|null,
 *   handleTabChange: Function,
 * }}
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import * as api from "api";
import logger from "utils/logger";
import { usePollingMatchdays } from "./usePollingMatchdays";
import type { Team, Competition, Match } from "../../../types";

const CURRENT_YEAR = new Date().getFullYear();

export function useNavigation() {
  const [appLoading, setAppLoading] = useState(true);

  const [countries, setCountries] = useState<string[]>([]);
  const [selCountry, setSelCountry] = useState<string | null>(null);

  const [teams, setTeams] = useState<Team[]>([]);
  const [selTeamId, setSelTeamId] = useState<number | null>(null);
  const [importingTeams, setImportingTeams] = useState(false);

  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selCompetitionId, setSelCompetitionId] = useState<number | null>(null);
  const [importingCompetitions, setImportingCompetitions] = useState(false);

  const {
    matchdays,
    loading: matchdaysLoading,
    error: matchdaysError,
  } = usePollingMatchdays(selTeamId, selCompetitionId);

  const [selRound, setSelRound] = useState<number | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selMatchId, setSelMatchId] = useState<number | null>(null);

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
    if (!selCountry) {
      setTeams([]);
      setSelTeamId(null);
      setCompetitions([]);
      setSelCompetitionId(null);
      setSelRound(null);
      setMatches([]);
      return;
    }
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
      .catch((err) => {
        if (!controller.signal.aborted) logger.error(err);
      });
    return () => controller.abort();
  }, [selCountry]);

  // ── Team → Competitions + Matches importieren ───────────────
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
  }, [selTeamId, teams]);

  // ── Competition → Reset ─────────────────────────────────────
  useEffect(() => {
    if (!selCompetitionId) return;
    setMatches([]);
    setSelRound(null);
  }, [selCompetitionId]);

  // ── Matchdays → letzten vorauswählen ────────────────────────
  useEffect(() => {
    if (
      selTeamId &&
      selCompetitionId &&
      matchdays.length > 0 &&
      selRound == null
    )
      setSelRound(matchdays[matchdays.length - 1]);
  }, [matchdays, selRound, selTeamId, selCompetitionId]);

  // ── Spieltag → Matches ──────────────────────────────────────
  useEffect(() => {
    if (!selTeamId || !selCompetitionId || !selRound) return;
    const controller = new AbortController();
    setMatches([]);
    api
      .fetchTeamMatchesByMatchday(selTeamId, selCompetitionId, selRound)
      .then((r) => {
        if (!controller.signal.aborted) setMatches(r.data);
      })
      .catch((err) => {
        if (!controller.signal.aborted) logger.error(err);
      });
    return () => controller.abort();
  }, [selTeamId, selCompetitionId, selRound]);

  const navProps = useMemo(
    () => ({
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
    }),
    [
      countries,
      selCountry,
      teams,
      importingTeams,
      selTeamId,
      competitions,
      importingCompetitions,
      selCompetitionId,
      matchdays,
      matchdaysLoading,
      matchdaysError,
      selRound,
      matches,
      selMatchId,
    ],
  );

  const curCompetition = useMemo(
    () => competitions.find((c) => c.id === selCompetitionId),
    [competitions, selCompetitionId],
  );

  const handleTabChange = useCallback(
    (tab: string, setActiveTab: (t: string) => void) => setActiveTab(tab),
    [],
  );

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
