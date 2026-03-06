// ============================================================
// Breadcrumb.jsx
// Zeigt: Liga › Saison › Spieltag › Heim vs Gast
// Klick → onOpen() öffnet MatchSelectorModal
// ============================================================
import React from "react";

export function Breadcrumb({ match, competition, onOpen }) {
  if (!match || !competition) return null;

  return (
    <button className="lt-breadcrumb" onClick={onOpen} title="Match wechseln">
      <span className="lt-breadcrumb__seg">{competition.title}</span>
      <span className="lt-breadcrumb__sep">›</span>
      <span className="lt-breadcrumb__seg">{match.round}</span>
      <span className="lt-breadcrumb__sep">›</span>
      <span className="lt-breadcrumb__seg lt-breadcrumb__seg--match">
        {match.homeTeam?.name} vs {match.awayTeam?.name}
      </span>
      <span className="lt-breadcrumb__edit">✎</span>
    </button>
  );
}
