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
  compact = false,
}) {
  return (
    <div className={compact ? "lt-start lt-start--compact" : "lt-start"}>
      <div className="lt-start__inner">
        {!compact && (
          <>
            <div className="lt-start__logo">{config.clubName}</div>
            <h1 className="lt-start__title">Select a Match to Start</h1>
            <p className="lt-start__sub">Choose a match to open the live ticker</p>
          </>
        )}

        <div className="lt-start__selects">
          {/* Land */}
          <div className="lt-start__select-wrap">
            <label className="lt-start__label">Land</label>
            <input
              className="lt-start__select lt-start__country-input"
              list="lt-countries-list"
              placeholder="Search country…"
              value={selCountry ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                onCountryChange(val);
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
            displayValue={competitions.find((c) => c.id === selCompetitionId)?.title}
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
}

function Dropdown({ label, disabled, value, placeholder, displayValue, items, onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="lt-start__select-wrap" ref={ref} style={{ position: "relative" }}>
      <label className="lt-start__label">{label}</label>
      <button
        className={`lt-start__select lt-dropdown__trigger${open ? " lt-dropdown__trigger--open" : ""}`}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        style={{ textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between" }}
      >
        <span style={{ color: displayValue ? "inherit" : "var(--lt-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {displayValue ?? placeholder}
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginLeft: 8, transition: "transform 0.15s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
          background: "var(--lt-bg-card-2)", border: "1px solid var(--lt-border)",
          borderRadius: 8, marginTop: 4, maxHeight: 220, overflowY: "auto",
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        }}>
          {items.map((item) => (
            <button
              key={item.value}
              onClick={() => { onSelect(item.value); setOpen(false); }}
              style={{
                width: "100%", textAlign: "left", padding: "0.55rem 0.85rem",
                background: item.value === value ? "var(--lt-accent-dim)" : "transparent",
                border: "none", color: item.value === value ? "var(--lt-accent)" : "var(--lt-text)",
                fontFamily: "var(--lt-font-mono)", fontSize: "0.78rem", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 8,
                borderBottom: "1px solid var(--lt-border)",
              }}
            >
              {item.value === value && <span style={{ color: "var(--lt-accent)" }}>✓</span>}
              {item.label}
            </button>
          ))}
        </div>
      )}
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

  // Auto-aufklappen wenn Spieltage geladen sind
  useEffect(() => {
    if (matchdays.length > 0) setOpen(true);
  }, [matchdays]);

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
    : "Spieltag auswählen";

  return (
    <div className="lt-mdp" ref={ref}>
      <div className="lt-start__select-wrap">
        <label className="lt-start__label">Spieltag</label>
        <button
          className={`lt-mdp__trigger lt-start__select${open ? " lt-mdp__trigger--open" : ""}`}
          disabled={disabled || matchdaysLoading || !matchdays.length}
          onClick={() => setOpen((v) => !v)}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
        >
          <span>{label}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, transition: "transform 0.15s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
            <path d="M6 9l6 6 6-6" />
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
