import { memo } from "react";
import config from "config/whitelabel";
import { CountryDropdown } from "./CountryDropdown";
import { Dropdown } from "./Dropdown";
import { MatchdayPicker } from "./MatchdayPicker";
import type { Team, Competition, Match } from "../../../types";

interface StartScreenProps {
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
  matchdaysError?: string | null;
  selRound: number | null;
  onRoundChange: (r: number) => void;
  matches: Match[];
  onMatchChange: (id: number) => void;
  compact?: boolean;
}

export const StartScreen: any = memo(function StartScreen({
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
}: StartScreenProps) {
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
            onSelect={(v) => onTeamChange(parseInt(String(v)))}
          />

          <Dropdown
            label={competitionsLoading ? "Wettbewerb (lädt…)" : "Wettbewerb"}
            disabled={!selTeamId || !competitions.length}
            value={selCompetitionId}
            placeholder="Wettbewerb auswählen"
            displayValue={
              competitions.find((c) => c.id === selCompetitionId)?.title ?? undefined
            }
            items={competitions.map((c) => ({ value: c.id, label: c.title ?? String(c.id) }))}
            onSelect={(v) => onCompetitionChange(parseInt(String(v)))}
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
