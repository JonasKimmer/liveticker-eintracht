// ============================================================
// StartScreen.jsx
// Zustand 1 – kein Match ausgewählt
// Kaskadierende Selects: Land → Team → Wettbewerb → Spieltag → Spiel
// Sobald Spiel gewählt → onMatchChange aufgerufen → LiveTicker wechselt
// ============================================================
import React from "react";
import config from "../../../config/whitelabel";

export function StartScreen({
  countries,
  selCountry,
  onCountryChange,
  teams,
  selTeamId,
  onTeamChange,
  competitions,
  selCompetitionId,
  onCompetitionChange,
  matchdays,
  matchdaysLoading,
  matchdaysError,
  selRound,
  onRoundChange,
  matches,
  onMatchChange,
}) {
  return (
    <div className="lt-start">
      <div className="lt-start__inner">
        <div className="lt-start__logo">{config.clubName}</div>
        <h1 className="lt-start__title">Select a Match to Start</h1>
        <p className="lt-start__sub">Choose a match to open the live ticker</p>

        <div className="lt-start__selects">
          <StartSelect
            label="Land"
            disabled={!countries.length}
            value={selCountry ?? ""}
            onChange={(v) => onCountryChange(v)}
          >
            <option value="" disabled>
              Land wählen…
            </option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </StartSelect>

          <StartSelect
            label="Team"
            disabled={!selCountry || !teams.length}
            value={selTeamId ?? ""}
            onChange={(v) => onTeamChange(parseInt(v))}
          >
            <option value="" disabled>
              Team wählen…
            </option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </StartSelect>

          <StartSelect
            label="Wettbewerb"
            disabled={!selTeamId || !competitions.length}
            value={selCompetitionId ?? ""}
            onChange={(v) => onCompetitionChange(parseInt(v))}
          >
            <option value="" disabled>
              Wettbewerb wählen…
            </option>
            {competitions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.league?.name} {c.season?.year}
              </option>
            ))}
          </StartSelect>

          <StartSelect
            label={
              matchdaysLoading
                ? "Spieltag (lädt…)"
                : matchdaysError
                  ? "Spieltag (Fehler)"
                  : "Spieltag"
            }
            disabled={!selCompetitionId || !matchdays.length}
            value={selRound ?? ""}
            onChange={(v) => onRoundChange(v)}
          >
            <option value="" disabled>
              Spieltag wählen…
            </option>
            {matchdays.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </StartSelect>

          <StartSelect
            label="Spiel"
            disabled={!selRound || !matches.length}
            value=""
            onChange={(v) => onMatchChange(parseInt(v))}
          >
            <option value="" disabled>
              Spiel wählen…
            </option>
            {matches.map((m) => (
              <option key={m.id} value={m.id}>
                {m.home_team.name} vs {m.away_team.name}
              </option>
            ))}
          </StartSelect>
        </div>

        <div className="lt-start__hint">
          Wähle ein Spiel — der Ticker startet automatisch
        </div>
      </div>
    </div>
  );
}

function StartSelect({ label, disabled, value, onChange, children }) {
  return (
    <div className="lt-start__select-wrap">
      <label className="lt-start__label">{label}</label>
      <select
        className="lt-start__select"
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {children}
      </select>
    </div>
  );
}
