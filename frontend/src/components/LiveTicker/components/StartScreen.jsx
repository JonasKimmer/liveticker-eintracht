// ============================================================
// StartScreen.jsx
// ============================================================
import { memo, useState, useRef, useEffect, useMemo } from "react";
import config from "../../../config/whitelabel";
import { useClickOutside } from "../../../hooks/useClickOutside";
import { knockoutThreshold, makeRoundLabel } from "../../../utils/roundLabel";

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
            <p className="lt-start__sub">Choose a match to open the live ticker</p>
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
});

const DROPDOWN_INPUT_STYLE = {
  width: "100%", background: "var(--lt-bg-card)", border: "1px solid var(--lt-border)",
  borderRadius: 6, padding: "0.45rem 2rem 0.45rem 0.7rem", color: "var(--lt-text)",
  fontFamily: "var(--lt-font-mono)", fontSize: "0.82rem", outline: "none",
  boxSizing: "border-box", cursor: "text",
};

const DROPDOWN_LIST_STYLE = {
  position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
  background: "var(--lt-bg-card-2)", border: "1px solid var(--lt-border)",
  borderRadius: 8, marginTop: 2, boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
  display: "flex", flexDirection: "column",
};

function DropdownList({ filtered, value, total, unit, onSelect }) {
  return (
    <div style={DROPDOWN_LIST_STYLE}>
      <div style={{ maxHeight: 220, overflowY: "auto" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: "0.7rem 0.85rem", color: "var(--lt-text-muted)", fontSize: "0.78rem", fontFamily: "var(--lt-font-mono)" }}>
            Keine Treffer
          </div>
        ) : (
          filtered.map(({ key, label, val }) => (
            <button
              key={key}
              onMouseDown={(e) => { e.preventDefault(); onSelect(val); }}
              style={{
                width: "100%", textAlign: "left", padding: "0.55rem 0.85rem",
                background: val === value ? "var(--lt-accent-dim)" : "transparent",
                border: "none", borderBottom: "1px solid var(--lt-border)",
                color: val === value ? "var(--lt-accent)" : "var(--lt-text)",
                fontFamily: "var(--lt-font-mono)", fontSize: "0.78rem", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 8,
              }}
            >
              {val === value && <span style={{ color: "var(--lt-accent)" }}>✓</span>}
              {label}
            </button>
          ))
        )}
      </div>
      <div style={{ padding: "0.3rem 0.85rem", borderTop: "1px solid var(--lt-border)", color: "var(--lt-text-muted)", fontSize: "0.7rem", fontFamily: "var(--lt-font-mono)" }}>
        {filtered.length} / {total} {unit}
      </div>
    </div>
  );
}

function CountryDropdown({ countries, value, onSelect }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);
  const inputRef = useRef(null);

  useClickOutside(ref, () => { setOpen(false); setQuery(""); });

  const filtered = useMemo(
    () => countries
      .filter((c) => c.toLowerCase().includes(query.toLowerCase()))
      .map((c) => ({ key: c, label: c, val: c })),
    [countries, query]
  );

  function handleFocus() { setOpen(true); setQuery(""); }
  function handleSelect(country) { onSelect(country); setOpen(false); setQuery(""); inputRef.current?.blur(); }
  function handleClear(e) { e.stopPropagation(); onSelect(null); setQuery(""); inputRef.current?.focus(); }

  return (
    <div className="lt-start__select-wrap" ref={ref} style={{ position: "relative" }}>
      <label className="lt-start__label">Land</label>
      <div style={{ position: "relative" }}>
        <input
          ref={inputRef}
          value={open ? query : (value ?? "")}
          placeholder="Land auswählen"
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
          style={{ ...DROPDOWN_INPUT_STYLE, borderColor: open ? "var(--lt-accent)" : "var(--lt-border)" }}
        />
        {value && !open ? (
          <button
            onMouseDown={handleClear}
            style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--lt-text-muted)", cursor: "pointer", fontSize: "1rem", lineHeight: 1, padding: 2 }}
            title="Auswahl zurücksetzen"
          >×</button>
        ) : (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ position: "absolute", right: 8, top: "50%", transform: `translateY(-50%) rotate(${open ? 180 : 0}deg)`, transition: "transform 0.15s", pointerEvents: "none", color: "var(--lt-text-muted)" }}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        )}
      </div>
      {open && (
        <DropdownList filtered={filtered} value={value} total={countries.length} unit="Länder" onSelect={handleSelect} />
      )}
    </div>
  );
}

function Dropdown({ label, disabled, value, placeholder, displayValue, items, onSelect }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);
  const inputRef = useRef(null);

  useClickOutside(ref, () => { setOpen(false); setQuery(""); });

  const filtered = useMemo(
    () => items
      .filter((item) => item.label.toLowerCase().includes(query.toLowerCase()))
      .map((item) => ({ key: item.value, label: item.label, val: item.value })),
    [items, query]
  );

  function handleFocus() { if (!disabled) { setOpen(true); setQuery(""); } }
  function handleSelect(val) { onSelect(val); setOpen(false); setQuery(""); inputRef.current?.blur(); }

  return (
    <div className="lt-start__select-wrap" ref={ref} style={{ position: "relative" }}>
      <label className="lt-start__label">{label}</label>
      <div style={{ position: "relative" }}>
        <input
          ref={inputRef}
          value={open ? query : (displayValue ?? "")}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
          style={{ ...DROPDOWN_INPUT_STYLE, borderColor: open ? "var(--lt-accent)" : "var(--lt-border)", opacity: disabled ? 0.45 : 1, cursor: disabled ? "not-allowed" : "text" }}
        />
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          style={{ position: "absolute", right: 8, top: "50%", transform: `translateY(-50%) rotate(${open ? 180 : 0}deg)`, transition: "transform 0.15s", pointerEvents: "none", color: "var(--lt-text-muted)" }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
      {open && (
        <DropdownList filtered={filtered} value={value} total={items.length} unit="Einträge" onSelect={handleSelect} />
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
  const { short: roundShort, full: roundFull } = useMemo(() => makeRoundLabel(matchdays), [matchdays]);

  const sortedMatchdays = useMemo(() => {
    const threshold = knockoutThreshold(matchdays);
    const group    = matchdays.filter((r) => r <= threshold).sort((a, b) => a - b);
    const knockout = matchdays.filter((r) => r > threshold).sort((a, b) => b - a);
    return [...group, ...knockout];
  }, [matchdays]);

  // Auto-aufklappen wenn Spieltage geladen sind
  useEffect(() => {
    if (matchdays.length > 0) setOpen(true);
  }, [matchdays]);

  useClickOutside(ref, () => setOpen(false));

  const label = matchdaysLoading
    ? "Spieltag (lädt…)"
    : matchdaysError
    ? "Spieltag (Fehler)"
    : selRound
    ? roundFull(selRound)
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
              {sortedMatchdays.map((r) => (
                <button
                  key={r}
                  className={`lt-mdp__day${selRound === r ? " lt-mdp__day--active" : ""}`}
                  onClick={() => onRoundChange(r)}
                >
                  {roundShort(r)}
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
