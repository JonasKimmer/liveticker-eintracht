import { memo } from "react";
import PropTypes from "prop-types";

export const StatRow = memo(function StatRow({ label, home, away, homeVal, awayVal, standalone }) {
  const hv = Number(homeVal ?? 0);
  const av = Number(awayVal ?? 0);
  const total = hv + av;
  const homePct = total > 0 ? (hv / total) * 100 : 50;
  const awayPct = total > 0 ? (av / total) * 100 : 50;

  if (standalone) {
    return (
      <>
        <div className="lt-stat-row">
          <span className="lt-stat-val lt-stat-val--home">{home}</span>
          <span className="lt-stat-lbl">{label}</span>
          <span className="lt-stat-val lt-stat-val--away">{away}</span>
        </div>
        {homeVal != null && awayVal != null && (
          <div className="lt-stat-bar">
            <div className="lt-stat-bar__home" style={{ width: `${homePct}%` }} />
            <div className="lt-stat-bar__away" style={{ width: `${awayPct}%` }} />
          </div>
        )}
      </>
    );
  }

  return (
    <div className="lt-stat-row">
      <span className="lt-stat-val lt-stat-val--home">{home}</span>
      <span className="lt-stat-lbl">{label}</span>
      <span className="lt-stat-val lt-stat-val--away">{away}</span>
      {homeVal != null && awayVal != null && (
        <div className="lt-stat-bar lt-stat-bar--inline">
          <div className="lt-stat-bar__home" style={{ width: `${homePct}%` }} />
          <div className="lt-stat-bar__away" style={{ width: `${awayPct}%` }} />
        </div>
      )}
    </div>
  );
});

StatRow.propTypes = {
  label: PropTypes.string.isRequired,
  home: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  away: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  homeVal: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  awayVal: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  standalone: PropTypes.bool,
};
