// ============================================================
// StartScreen.jsx
// ============================================================
import { useState, useRef, useEffect } from "react";
import config from "../../../config/whitelabel";

export function StartScreen({
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
}) {
  return (
    <div className="lt-start">
      <div className="lt-start__inner">
        <div className="lt-start__logo">{config.clubName}</div>
        <h1 className="lt-start__title">Select a Match to Start</h1>
        <p className="lt-start__sub">Choose a match to open the live ticker</p>

        <div className="lt-start__selects">
          {/* Land – Textfeld mit Autocomplete */}
          <div className="lt-start__select-wrap">
            <label className="lt-start__label">Land</label>
            <input
              className="lt-start__select lt-start__country-input"
              list="lt-countries-list"
              placeholder="Search country…"
              value={selCountry ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                if (countries.includes(val)) onCountryChange(val);
                else onCountryChange(val); // live update for display
              }}
              onBlur={(e) => {
                if (!countries.includes(e.target.value)) onCountryChange(null);
              }}
            />
            <datalist id="lt-countries-list">
              {countries.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          <StartSelect
            label={teamsLoading ? "Team (lädt…)" : "Team"}
            disabled={!selCountry || !teams.length}
            value={selTeamId ?? ""}
            onChange={(v) => onTeamChange(parseInt(v))}
          >
            <option value="" disabled>Select a Team</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </StartSelect>

          <StartSelect
            label={competitionsLoading ? "Wettbewerb (lädt…)" : "Wettbewerb"}
            disabled={!selTeamId || !competitions.length}
            value={selCompetitionId ?? ""}
            onChange={(v) => onCompetitionChange(parseInt(v))}
          >
            <option value="" disabled>Select Wettbewerb</option>
            {competitions.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </StartSelect>
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

        <div className="lt-start__hint">
          Wähle ein Spiel — der Ticker startet automatisch
        </div>
      </div>
    </div>
  );
}

function MatchdayPicker({
  matchdays,
  matchdaysLoading,
  matchdaysError,
  selRound,
  onRoundChange,
  matches,
  onMatchChange,
  disabled,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const roundLabel = (r) => String(r).match(/\d+/)?.[0] ?? String(r);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const label = matchdaysLoading
    ? "Spieltag (lädt…)"
    : matchdaysError
    ? "Spieltag (Fehler)"
    : selRound
    ? `Spieltag ${roundLabel(selRound)}`
    : "Select Spieltag";

  return (
    <div className="lt-mdp" ref={ref}>
      <div className="lt-start__select-wrap">
        <label className="lt-start__label">Spieltag</label>
        <button
          className={`lt-mdp__trigger lt-start__select${open ? " lt-mdp__trigger--open" : ""}`}
          disabled={disabled || matchdaysLoading || !matchdays.length}
          onClick={() => setOpen((v) => !v)}
        >
          <span>{label}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d={open ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} />
          </svg>
        </button>
      </div>

      {open && (
        <div className="lt-mdp__panel">
          {matchdays.length > 0 && (
            <div className="lt-mdp__grid">
              {matchdays.map((r) => (
                <button
                  key={r}
                  className={`lt-mdp__day${selRound === r ? " lt-mdp__day--active" : ""}`}
                  onClick={() => onRoundChange(r)}
                >
                  {roundLabel(r)}
                </button>
              ))}
            </div>
          )}

          {selRound && (
            <div className="lt-mdp__matches">
              {matches.length === 0 ? (
                <div className="lt-mdp__empty">Keine Spiele für diesen Spieltag</div>
              ) : (
                matches.map((m) => (
                  <button
                    key={m.id}
                    className="lt-mdp__match"
                    onClick={() => { onMatchChange(m.id); setOpen(false); }}
                  >
                    <span className="lt-mdp__match-team lt-mdp__match-team--home">
                      {m.homeTeam?.name ?? "–"}
                    </span>
                    <span className="lt-mdp__match-score">
                      {m.homeScore != null && m.awayScore != null
                        ? `${m.homeScore} : ${m.awayScore}`
                        : "vs"}
                    </span>
                    <span className="lt-mdp__match-team lt-mdp__match-team--away">
                      {m.awayTeam?.name ?? "–"}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
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
