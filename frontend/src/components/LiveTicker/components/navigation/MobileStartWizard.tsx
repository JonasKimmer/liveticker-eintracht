import { useState, useMemo } from "react";
import { knockoutThreshold, makeRoundLabel } from "utils/roundLabel";
import type { Team, Competition, Match } from "../../../../types";

interface MobileStartWizardProps {
  countries: string[];
  selCountry: string | null;
  onCountryChange: (c: string) => void;
  teams: Team[];
  teamsLoading?: boolean;
  selTeamId: number | null;
  onTeamChange: (id: number) => void;
  competitions: Competition[];
  competitionsLoading?: boolean;
  selCompetitionId: number | null;
  onCompetitionChange: (id: number) => void;
  matchdays: number[];
  matchdaysLoading?: boolean;
  selRound: number | null;
  onRoundChange: (r: number) => void;
  matches: Match[];
  onMatchChange: (id: number) => void;
}

// Step 0 = country, 1 = team, 2 = competition, 3 = matchday/match
export function MobileStartWizard({
  countries,
  selCountry,
  onCountryChange,
  teams,
  teamsLoading,
  selTeamId,
  onTeamChange,
  competitions,
  competitionsLoading,
  selCompetitionId,
  onCompetitionChange,
  matchdays,
  matchdaysLoading,
  selRound,
  onRoundChange,
  matches,
  onMatchChange,
}: MobileStartWizardProps) {
  const [step, setStep] = useState(0);
  const [query, setQuery] = useState("");

  const { short: roundShort, full: roundFull } = useMemo(
    () => makeRoundLabel(matchdays),
    [matchdays],
  );

  const sortedMatchdays = useMemo(() => {
    const threshold = knockoutThreshold(matchdays);
    const group = matchdays.filter((r) => r <= threshold).sort((a, b) => a - b);
    const knockout = matchdays.filter((r) => r > threshold).sort((a, b) => b - a);
    return [...group, ...knockout];
  }, [matchdays]);

  const STEPS = [
    { label: "Land", value: selCountry },
    { label: "Team", value: teams.find((t) => t.id === selTeamId)?.name ?? null },
    {
      label: "Wettbewerb",
      value:
        competitions.find((c) => c.id === selCompetitionId)?.title ?? null,
    },
    { label: "Spieltag", value: selRound ? roundFull(selRound) : null },
  ];

  function goToStep(s: number) {
    setStep(s);
    setQuery("");
  }

  function handleCountry(c: string) {
    onCountryChange(c);
    goToStep(1);
  }

  function handleTeam(id: number) {
    onTeamChange(id);
    goToStep(2);
  }

  function handleCompetition(id: number) {
    onCompetitionChange(id);
    goToStep(3);
  }

  function handleRound(r: number) {
    onRoundChange(r);
  }

  function handleMatch(id: number) {
    onMatchChange(id);
  }

  const stepTitle = [
    "Land auswählen",
    teamsLoading ? "Teams laden…" : "Team auswählen",
    competitionsLoading ? "Wettbewerbe laden…" : "Wettbewerb auswählen",
    matchdaysLoading ? "Spieltage laden…" : "Spieltag & Spiel",
  ][step];

  return (
    <div className="lt-wizard">
      {/* Completed steps — tap to go back */}
      <div className="lt-wizard__crumbs">
        {STEPS.slice(0, step).map((s, i) => (
          <button
            key={i}
            className="lt-wizard__crumb"
            onClick={() => goToStep(i)}
          >
            <span className="lt-wizard__crumb-label">{s.label}</span>
            <span className="lt-wizard__crumb-value">{s.value}</span>
            <span className="lt-wizard__crumb-edit">✎</span>
          </button>
        ))}
      </div>

      {/* Current step header */}
      <div className="lt-wizard__header">
        {step > 0 && (
          <button
            className="lt-wizard__back"
            onClick={() => goToStep(step - 1)}
          >
            ‹
          </button>
        )}
        <span className="lt-wizard__title">{stepTitle}</span>
        <span className="lt-wizard__step-dot">
          {step + 1} / {STEPS.length}
        </span>
      </div>

      {/* Search (steps 0-2) */}
      {step < 3 && (
        <div className="lt-wizard__search-wrap">
          <input
            className="lt-wizard__search"
            placeholder="Suchen…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>
      )}

      {/* Step content */}
      <div className="lt-wizard__list">
        {step === 0 &&
          countries
            .filter((c) => c.toLowerCase().includes(query.toLowerCase()))
            .map((c) => (
              <button
                key={c}
                className={`lt-wizard__item${selCountry === c ? " lt-wizard__item--active" : ""}`}
                onClick={() => handleCountry(c)}
              >
                {c}
              </button>
            ))}

        {step === 1 &&
          teams
            .filter((t) => t.name.toLowerCase().includes(query.toLowerCase()))
            .map((t) => (
              <button
                key={t.id}
                className={`lt-wizard__item${selTeamId === t.id ? " lt-wizard__item--active" : ""}`}
                onClick={() => handleTeam(t.id)}
              >
                {t.name}
              </button>
            ))}

        {step === 2 &&
          competitions
            .filter((c) =>
              (c.title ?? "").toLowerCase().includes(query.toLowerCase()),
            )
            .map((c) => (
              <button
                key={c.id}
                className={`lt-wizard__item${selCompetitionId === c.id ? " lt-wizard__item--active" : ""}`}
                onClick={() => handleCompetition(c.id)}
              >
                {c.title}
              </button>
            ))}

        {step === 3 && (
          <>
            {/* Matchday grid */}
            <div className="lt-wizard__days">
              {sortedMatchdays.map((r) => (
                <button
                  key={r}
                  className={`lt-wizard__day${selRound === r ? " lt-wizard__day--active" : ""}`}
                  onClick={() => handleRound(r)}
                >
                  {roundShort(r)}
                </button>
              ))}
            </div>

            {/* Match list */}
            {selRound && matches.length === 0 && (
              <div className="lt-wizard__empty">Keine Spiele für diesen Spieltag</div>
            )}
            {matches.map((m) => (
              <button
                key={m.id}
                className="lt-wizard__match"
                onClick={() => handleMatch(m.id)}
              >
                <span className="lt-wizard__match-team lt-wizard__match-team--home">
                  {m.homeTeam?.name ?? "–"}
                </span>
                <span className="lt-wizard__match-score">
                  {m.homeScore != null && m.awayScore != null
                    ? `${m.homeScore}:${m.awayScore}`
                    : "vs"}
                </span>
                <span className="lt-wizard__match-team lt-wizard__match-team--away">
                  {m.awayTeam?.name ?? "–"}
                </span>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
