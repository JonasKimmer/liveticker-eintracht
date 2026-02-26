// ============================================================
// MatchSelectorModal.jsx
// Tabs: Teams / Heute / Live / Favoriten
// Teams-Tab → voller Kaskaden-Pfad
// Andere Tabs → nur Spiel-Selector (Matches werden extern geladen)
// Spiel wählen → onMatchChange + onClose
// ============================================================
import React, { useEffect, useRef } from "react";
import { NAV_TABS } from "../constants";

export function MatchSelectorModal({
  onClose,
  // Tab
  activeTab,
  onTabChange,
  // Nav Props
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
  selMatchId,
  onMatchChange,
}) {
  const overlayRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleMatchChange = (v) => {
    onMatchChange(parseInt(v));
    onClose();
  };

  return (
    <div
      className="lt-msm-overlay"
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="lt-msm">
        <div className="lt-msm__header">
          <span className="lt-msm__title">Match wechseln</span>
          <button className="lt-msm__close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Tab-Leiste */}
        <div className="lt-msm__tabs">
          {NAV_TABS.map(({ id, label }) => (
            <button
              key={id}
              className={`lt-nav__tab${activeTab === id ? " lt-nav__tab--active" : ""}`}
              onClick={() => onTabChange(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="lt-msm__selects">
          {/* Teams-Pfad: volle Kaskade */}
          {activeTab === "teams" && (
            <>
              <ModalSelect
                label="Land"
                disabled={!countries.length}
                value={selCountry ?? ""}
                onChange={onCountryChange}
              >
                {countries.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </ModalSelect>

              <ModalSelect
                label="Team"
                disabled={!selCountry || !teams.length}
                value={selTeamId ?? ""}
                onChange={(v) => onTeamChange(parseInt(v))}
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </ModalSelect>

              <ModalSelect
                label="Wettbewerb"
                disabled={!selTeamId || !competitions.length}
                value={selCompetitionId ?? ""}
                onChange={(v) => onCompetitionChange(parseInt(v))}
              >
                {competitions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.league?.name} {c.season?.year}
                  </option>
                ))}
              </ModalSelect>

              <ModalSelect
                label={
                  matchdaysLoading
                    ? "Spieltag (lädt…)"
                    : matchdaysError
                      ? "Spieltag (Fehler)"
                      : "Spieltag"
                }
                disabled={!selCompetitionId || !matchdays.length}
                value={selRound ?? ""}
                onChange={onRoundChange}
              >
                {matchdays.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </ModalSelect>
            </>
          )}

          {/* Spiel-Selector — immer sichtbar */}
          <ModalSelect
            label="Spiel"
            disabled={!matches.length}
            value={selMatchId ?? ""}
            onChange={handleMatchChange}
          >
            <option value="" disabled>
              Spiel wählen…
            </option>
            {matches.map((m) => (
              <option key={m.id} value={m.id}>
                {m.home_team.name} vs {m.away_team.name}
              </option>
            ))}
          </ModalSelect>
        </div>

        <div className="lt-msm__footer">
          <button className="lt-btn lt-btn--ghost" onClick={onClose}>
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalSelect({ label, disabled, value, onChange, children }) {
  return (
    <div className="lt-nav__select-wrap">
      <label className="lt-nav__label">{label}</label>
      <select
        className="lt-nav__select"
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {children}
      </select>
    </div>
  );
}
