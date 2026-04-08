import { memo, type RefObject } from "react";
import config from "config/whitelabel";
import { CountryDropdown } from "../dropdown/CountryDropdown";
import { Dropdown } from "../dropdown/Dropdown";
import { MatchdayPicker } from "./MatchdayPicker";
import { TickerModeSelector } from "./TickerModeSelector";
import type { Team, Competition, Match, TickerMode } from "../../../../types";

export interface StartScreenProps {
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
  firstInputRef?: RefObject<HTMLInputElement>;
  mode?: TickerMode;
  onModeChange?: (mode: TickerMode) => void;
}

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
  firstInputRef,
  mode,
  onModeChange,
}: StartScreenProps) {
  return (
    <div className={compact ? "lt-start lt-start--compact" : "lt-start"}>
      <div className="lt-start__inner">
        {!compact && (
          <>
            <div className="lt-start__logo">
              <img
                src="/lt-logo.png"
                alt={config.clubName}
                className="lt-start__logo-img"
              />
            </div>
            <h1 className="lt-start__title">Spiel auswählen</h1>
          </>
        )}

        <div className="lt-start__selects">
          <CountryDropdown
            countries={countries}
            value={selCountry}
            onSelect={onCountryChange}
            focusRef={firstInputRef}
          />

          <Dropdown
            label={teamsLoading ? "Team (lädt…)" : "Team"}
            disabled={!selCountry}
            value={selTeamId}
            placeholder="Team auswählen"
            displayValue={teams.find((t) => t.id === selTeamId)?.name}
            items={teams.map((t) => ({ value: t.id, label: t.name }))}
            onSelect={(v) => onTeamChange(parseInt(String(v)))}
          />

          <Dropdown
            label={competitionsLoading ? "Wettbewerb (lädt…)" : "Wettbewerb"}
            disabled={!selTeamId}
            value={selCompetitionId}
            placeholder="Wettbewerb auswählen"
            displayValue={
              competitions.find((c) => c.id === selCompetitionId)?.title ??
              undefined
            }
            items={competitions.map((c) => ({
              value: c.id,
              label: c.title ?? String(c.id),
            }))}
            onSelect={(v) => onCompetitionChange(parseInt(String(v)))}
          />
        </div>

        <div className="lt-start__row2">
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

          {mode && onModeChange && (
            <TickerModeSelector value={mode} onChange={onModeChange} />
          )}
        </div>

        {!compact && (
          <div className="lt-start__hint">
            Wähle ein Spiel — der Ticker startet automatisch
          </div>
        )}
      </div>
    </div>
  );
});
