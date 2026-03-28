import { memo } from "react";
import config from "config/whitelabel";
import { CountryDropdown } from "./CountryDropdown";
import { Dropdown } from "./Dropdown";
import { MatchdayPicker } from "./MatchdayPicker";

export const StartScreen = memo(function StartScreen({
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
  matchdaysError,
  selRound,
  onRoundChange,
  matches,
  onMatchChange,
  compact = false,
}) {
  return (
    <div className={compact ? "lt-start lt-start--compact" : "lt-start"}>
      <div className="lt-start__inner">
        {!compact && (
          <>
            <div className="lt-start__logo">{config.clubName}</div>
            <h1 className="lt-start__title">Select a Match to Start</h1>
            <p className="lt-start__sub">
              Choose a match to open the live ticker
            </p>
          </>
        )}

        <div className="lt-start__selects">
          <CountryDropdown
            countries={countries}
            value={selCountry}
            onSelect={onCountryChange}
          />

          <Dropdown
            label={teamsLoading ? "Team (lädt…)" : "Team"}
            disabled={!selCountry || !teams.length}
            value={selTeamId}
            placeholder="Team auswählen"
            displayValue={teams.find((t) => t.id === selTeamId)?.name}
            items={teams.map((t) => ({ value: t.id, label: t.name }))}
            onSelect={(v) => onTeamChange(parseInt(v))}
          />

          <Dropdown
            label={competitionsLoading ? "Wettbewerb (lädt…)" : "Wettbewerb"}
            disabled={!selTeamId || !competitions.length}
            value={selCompetitionId}
            placeholder="Wettbewerb auswählen"
            displayValue={
              competitions.find((c) => c.id === selCompetitionId)?.title
            }
            items={competitions.map((c) => ({ value: c.id, label: c.title }))}
            onSelect={(v) => onCompetitionChange(parseInt(v))}
          />
        </div>

        <MatchdayPicker
          matchdays={matchdays}
          matchdaysLoading={matchdaysLoading}
          matchdaysError={matchdaysError}
          selRound={selRound}
          onRoundChange={onRoundChange}
          matches={matches}
          onMatchChange={onMatchChange}
          disabled={!selCompetitionId}
        />

        {!compact && (
          <div className="lt-start__hint">
            Wähle ein Spiel — der Ticker startet automatisch
          </div>
        )}
      </div>
    </div>
  );
});
