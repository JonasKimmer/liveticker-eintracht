// ============================================================
// MatchSelectorModal.jsx
// ============================================================
import { memo, useEffect, useRef, useState } from "react";
import { useClickOutside } from "../../../hooks/useClickOutside";

export const MatchSelectorModal = memo(function MatchSelectorModal({
  onClose,
  activeTab,
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
  selMatchId,
  onMatchChange,
}) {
  const overlayRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="lt-msm-overlay"
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="lt-msm">
        <div className="lt-msm__header">
          <span className="lt-msm__title">Match wechseln</span>
          <button className="lt-msm__close" onClick={onClose}>✕</button>
        </div>

        <div className="lt-msm__selects">
          {activeTab === "teams" && (
            <>
              {/* Land – Textfeld mit Autocomplete */}
              <div className="lt-msm__select-wrap">
                <label className="lt-msm__label">Land</label>
                <input
                  className="lt-msm__input"
                  list="lt-msm-countries"
                  placeholder="Search country…"
                  value={selCountry ?? ""}
                  onChange={(e) => onCountryChange(e.target.value)}
                  onBlur={(e) => {
                    if (!countries.includes(e.target.value)) onCountryChange(null);
                  }}
                />
                <datalist id="lt-msm-countries">
                  {countries.map((c) => <option key={c} value={c} />)}
                </datalist>
              </div>

              <MsmDropdown
                label={teamsLoading ? "Team (lädt…)" : "Team"}
                disabled={!selCountry || !teams.length}
                value={selTeamId}
                displayValue={teams.find((t) => t.id === selTeamId)?.name}
                placeholder="Select a Team"
                onSelect={(v) => onTeamChange(parseInt(v))}
                items={teams.map((t) => ({ value: t.id, label: t.name }))}
              />

              <MsmDropdown
                label={competitionsLoading ? "Wettbewerb (lädt…)" : "Wettbewerb"}
                disabled={!selTeamId || !competitions.length}
                value={selCompetitionId}
                displayValue={competitions.find((c) => c.id === selCompetitionId)?.title}
                placeholder="Select Wettbewerb"
                onSelect={(v) => onCompetitionChange(parseInt(v))}
                items={competitions.map((c) => ({ value: c.id, label: c.title }))}
              />

              {/* Spieltag Picker */}
              <MsmMatchdayPicker
                matchdays={matchdays}
                matchdaysLoading={matchdaysLoading}
                matchdaysError={matchdaysError}
                selRound={selRound}
                onRoundChange={onRoundChange}
                matches={matches}
                selMatchId={selMatchId}
                onMatchChange={(id) => { onMatchChange(id); onClose(); }}
                disabled={!selCompetitionId}
              />
            </>
          )}

          {/* Spiel-Selector für andere Tabs */}
          {activeTab !== "teams" && (
            <MsmSelect
              label="Spiel"
              disabled={!matches.length}
              value={selMatchId ?? ""}
              onChange={(v) => { onMatchChange(parseInt(v)); onClose(); }}
            >
              <option value="" disabled>Spiel wählen…</option>
              {matches.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.homeTeam?.name} vs {m.awayTeam?.name}
                </option>
              ))}
            </MsmSelect>
          )}
        </div>

        <div className="lt-msm__footer">
          <button className="lt-btn lt-btn--ghost" onClick={onClose}>Abbrechen</button>
        </div>
      </div>
    </div>
  );
});

function MsmMatchdayPicker({
  matchdays, matchdaysLoading, matchdaysError,
  selRound, onRoundChange, matches, selMatchId, onMatchChange, disabled,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const roundLabel = (r) => String(r).match(/\d+/)?.[0] ?? String(r);

  useClickOutside(ref, () => setOpen(false));

  const label = matchdaysLoading
    ? "Spieltag (lädt…)"
    : matchdaysError ? "Spieltag (Fehler)"
    : selRound ? `Spieltag ${roundLabel(selRound)}`
    : "Select Spieltag";

  return (
    <div className="lt-msm__mdp" ref={ref}>
      <div className="lt-msm__select-wrap">
        <label className="lt-msm__label">Spieltag</label>
        <button
          className={`lt-msm__input lt-msm__mdp-trigger${open ? " lt-msm__mdp-trigger--open" : ""}`}
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
        <div className="lt-msm__mdp-panel">
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

          {selRound && (
            <div className="lt-mdp__matches">
              {matches.length === 0 ? (
                <div className="lt-mdp__empty">Keine Spiele</div>
              ) : (
                matches.map((m) => (
                  <button
                    key={m.id}
                    className={`lt-mdp__match${selMatchId === m.id ? " lt-mdp__match--active" : ""}`}
                    onClick={() => onMatchChange(m.id)}
                  >
                    <span className="lt-mdp__match-team lt-mdp__match-team--home">{m.homeTeam?.name ?? "–"}</span>
                    <span className="lt-mdp__match-score">
                      {m.homeScore != null && m.awayScore != null ? `${m.homeScore} : ${m.awayScore}` : "vs"}
                    </span>
                    <span className="lt-mdp__match-team lt-mdp__match-team--away">{m.awayTeam?.name ?? "–"}</span>
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

function MsmDropdown({ label, disabled, value, displayValue, placeholder, onSelect, items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useClickOutside(ref, () => setOpen(false));

  return (
    <div className="lt-msm__mdp" ref={ref}>
      <div className="lt-msm__select-wrap">
        <label className="lt-msm__label">{label}</label>
        <button
          className={`lt-msm__input lt-msm__mdp-trigger${open ? " lt-msm__mdp-trigger--open" : ""}`}
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
        >
          <span style={{ color: displayValue ? "inherit" : "var(--lt-text-muted)" }}>
            {displayValue ?? placeholder}
          </span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d={open ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} />
          </svg>
        </button>
      </div>

      {open && (
        <div className="lt-msm__mdp-panel">
          {items.map((item) => (
            <button
              key={item.value}
              className={`lt-msm__dropdown-item${value === item.value ? " lt-msm__dropdown-item--active" : ""}`}
              onClick={() => { onSelect(item.value); setOpen(false); }}
            >
              {value === item.value && <span>✓ </span>}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MsmSelect({ label, disabled, value, onChange, children }) {
  return (
    <div className="lt-msm__select-wrap">
      <label className="lt-msm__label">{label}</label>
      <select
        className="lt-msm__input lt-msm__select"
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {children}
      </select>
    </div>
  );
}
