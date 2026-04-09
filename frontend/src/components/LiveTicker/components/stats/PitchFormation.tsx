import { memo } from "react";
import { PlayerBadges } from "./PlayerBadges";
import type { LineupEntry, PlayerStat } from "../../../../types";

interface PitchFormationProps {
  homeStarters: LineupEntry[];
  awayStarters: LineupEntry[];
  homeAbbr: string;
  awayAbbr: string;
  playerName: (id: number | undefined | null) => string | null;
  playerStats: PlayerStat[];
  subMinuteMap: Record<string | number, number>;
}

function getRows(lineup: LineupEntry[]): LineupEntry[][] {
  const formation = lineup[0]?.formation ?? "";
  const posOrder: Record<string, number> = { G: 0, D: 1, M: 2, F: 3 };
  const sorted = [...lineup].sort(
    (a, b) =>
      (posOrder[a.position ?? "M"] ?? 2) - (posOrder[b.position ?? "M"] ?? 2)
  );
  if (formation) {
    const counts = [1, ...formation.split("-").map(Number)];
    let idx = 0;
    return counts.map((count) => {
      const row = sorted.slice(idx, idx + count);
      idx += count;
      return row;
    });
  }
  const groups: Record<string, LineupEntry[]> = {};
  for (const p of sorted) {
    const pos = p.position ?? "M";
    if (!groups[pos]) groups[pos] = [];
    groups[pos].push(p);
  }
  return Object.values(groups);
}

// SVG pitch lines only — no players
function FullPitchLines() {
  const W = 100, H = 160, m = 3;
  const cx = W / 2, cy = H / 2;
  const pw = W - m * 2, ph = H - m * 2;
  const paW = pw * 0.58, paH = ph * 0.13;
  const paX = m + (pw - paW) / 2;
  const sW = pw * 0.34, sH = ph * 0.055;
  const sX = m + (pw - sW) / 2;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="lt-pitch-svg lt-pitch-svg--full">
      <PitchLines m={m} pw={pw} ph={ph} cx={cx} cy={cy} paX={paX} paW={paW} paH={paH} sX={sX} sW={sW} sH={sH} />
    </svg>
  );
}

function HalfPitchLines() {
  const W = 100, H = 90, m = 3;
  const pw = W - m * 2, ph = H - m * 2;
  const cx = W / 2;
  const paW = pw * 0.58, paH = ph * 0.22;
  const paX = m + (pw - paW) / 2;
  const sW = pw * 0.34, sH = ph * 0.1;
  const sX = m + (pw - sW) / 2;
  const r = ph * 0.09; // center circle radius for half
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="lt-pitch-svg lt-pitch-svg--half">
      {/* Outline */}
      <rect x={m} y={m} width={pw} height={ph} className="lt-pitch-outline" />
      {/* Midfield line at top */}
      <line x1={m} y1={m} x2={W - m} y2={m} className="lt-pitch-midline" />
      {/* Center circle semicircle at midfield line (bulges into field) */}
      <path d={`M ${cx - r} ${m} A ${r} ${r} 0 0 1 ${cx + r} ${m}`} className="lt-pitch-circle" />
      {/* Penalty area at bottom */}
      <rect x={paX} y={H - m - paH} width={paW} height={paH} className="lt-pitch-area" />
      <rect x={sX} y={H - m - sH} width={sW} height={sH} className="lt-pitch-area" />
    </svg>
  );
}

interface PitchLinesProps {
  m: number; pw: number; ph: number;
  cx: number; cy: number;
  paX: number; paW: number; paH: number;
  sX: number; sW: number; sH: number;
}
function PitchLines({ m, pw, ph, cx, cy, paX, paW, paH, sX, sW, sH }: PitchLinesProps) {
  return (
    <>
      <rect x={m} y={m} width={pw} height={ph} className="lt-pitch-outline" />
      <line x1={m} y1={cy} x2={m + pw} y2={cy} className="lt-pitch-outline" />
      <circle cx={cx} cy={cy} r={ph * 0.09} className="lt-pitch-circle" />
      <circle cx={cx} cy={cy} r={0.8} className="lt-pitch-spot" />
      <rect x={paX} y={m} width={paW} height={paH} className="lt-pitch-area" />
      <rect x={sX} y={m} width={sW} height={sH} className="lt-pitch-area" />
      <rect x={paX} y={m + ph - paH} width={paW} height={paH} className="lt-pitch-area" />
      <rect x={sX} y={m + ph - sH} width={sW} height={sH} className="lt-pitch-area" />
    </>
  );
}

// Formation player — same style as old FormationColumn
function FormationPlayer({
  p,
  playerName,
  stat,
  subMinuteMap,
}: {
  p: LineupEntry;
  playerName: (id: number | undefined | null) => string | null;
  stat?: PlayerStat;
  subMinuteMap: Record<string | number, number>;
}) {
  const name = playerName(p.playerId) ?? "";
  const short = name.length > 9 ? name.split(" ").pop() ?? name : name || `#${p.jerseyNumber}`;
  return (
    <div className="lt-formation-player">
      <div className="lt-formation-player__num">#{p.jerseyNumber}</div>
      <div className="lt-formation-player__name" title={name}>{short}</div>
      {stat?.rating != null && (
        <div className="lt-formation-player__rating">{stat.rating.toFixed(1)}</div>
      )}
      <PlayerBadges entry={p} stat={stat} subMinuteMap={subMinuteMap} />
    </div>
  );
}

function FormationRows({
  rows,
  playerName,
  playerStats,
  subMinuteMap,
  reverse = false,
}: {
  rows: LineupEntry[][];
  playerName: (id: number | undefined | null) => string | null;
  playerStats: PlayerStat[];
  subMinuteMap: Record<string | number, number>;
  reverse?: boolean;
}) {
  const displayed = reverse ? [...rows].reverse() : rows;
  return (
    <div className="lt-pitch-rows">
      {displayed.map((row, ri) => (
        <div key={ri} className="lt-formation-row">
          {row.map((p) => (
            <FormationPlayer
              key={p.id}
              p={p}
              playerName={playerName}
              stat={playerStats.find((s) => s.playerId === p.playerId)}
              subMinuteMap={subMinuteMap}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function FullPitch({
  homeRows, awayRows, homeAbbr, awayAbbr, playerName, playerStats, subMinuteMap,
}: {
  homeRows: LineupEntry[][];
  awayRows: LineupEntry[][];
  homeAbbr: string;
  awayAbbr: string;
  playerName: (id: number | undefined | null) => string | null;
  playerStats: PlayerStat[];
  subMinuteMap: Record<string | number, number>;
}) {
  return (
    <div className="lt-pitch-wrap">
      <FullPitchLines />
      <div className="lt-pitch-overlay">
        <div className="lt-pitch-half lt-pitch-half--home">
          <div className="lt-lineup-team-label lt-lineup-team-label--home lt-pitch-label">
            {homeAbbr}
            {homeRows[0]?.[0]?.formation && (
              <span className="lt-lineup-formation" style={{ display: "inline", marginLeft: "0.4rem", borderBottom: "none", padding: 0, marginBottom: 0 }}>
                {homeRows[0][0].formation}
              </span>
            )}
          </div>
          <FormationRows rows={homeRows} playerName={playerName} playerStats={playerStats} subMinuteMap={subMinuteMap} />
        </div>
        <div className="lt-pitch-half lt-pitch-half--away">
          <div className="lt-lineup-team-label lt-lineup-team-label--away lt-pitch-label">
            {awayAbbr}
            {awayRows[0]?.[0]?.formation && (
              <span className="lt-lineup-formation" style={{ display: "inline", marginLeft: "0.4rem", borderBottom: "none", padding: 0, marginBottom: 0 }}>
                {awayRows[0][0].formation}
              </span>
            )}
          </div>
          <FormationRows rows={awayRows} playerName={playerName} playerStats={playerStats} subMinuteMap={subMinuteMap} reverse />
        </div>
      </div>
    </div>
  );
}

function HalfPitch({
  rows, abbr, isHome, playerName, playerStats, subMinuteMap,
}: {
  rows: LineupEntry[][];
  abbr: string;
  isHome: boolean;
  playerName: (id: number | undefined | null) => string | null;
  playerStats: PlayerStat[];
  subMinuteMap: Record<string | number, number>;
}) {
  const formation = rows[0]?.[0]?.formation ?? "";
  const labelClass = isHome
    ? "lt-lineup-team-label lt-lineup-team-label--home"
    : "lt-lineup-team-label lt-lineup-team-label--away";
  return (
    <div>
      <div className={labelClass}>
        {abbr}
        {formation && (
          <span className="lt-lineup-formation" style={{ display: "inline", marginLeft: "0.4rem", borderBottom: "none", padding: 0, marginBottom: 0 }}>
            {formation}
          </span>
        )}
      </div>
      <div className="lt-pitch-wrap">
        <HalfPitchLines />
        <div className="lt-pitch-overlay lt-pitch-overlay--single">
          {/* reverse=true: GK at bottom near penalty area */}
          <FormationRows rows={rows} playerName={playerName} playerStats={playerStats} subMinuteMap={subMinuteMap} reverse />
        </div>
      </div>
    </div>
  );
}

export const PitchFormation = memo(function PitchFormation({
  homeStarters,
  awayStarters,
  homeAbbr,
  awayAbbr,
  playerName,
  playerStats,
  subMinuteMap,
}: PitchFormationProps) {
  const homeRows = getRows(homeStarters);
  const awayRows = getRows(awayStarters);

  return (
    <>
      <div className="lt-pitch-full">
        <FullPitch
          homeRows={homeRows}
          awayRows={awayRows}
          homeAbbr={homeAbbr}
          awayAbbr={awayAbbr}
          playerName={playerName}
          playerStats={playerStats}
          subMinuteMap={subMinuteMap}
        />
      </div>
      <div className="lt-pitch-halves">
        <HalfPitch
          rows={homeRows}
          abbr={homeAbbr}
          isHome
          playerName={playerName}
          playerStats={playerStats}
          subMinuteMap={subMinuteMap}
        />
        <HalfPitch
          rows={awayRows}
          abbr={awayAbbr}
          isHome={false}
          playerName={playerName}
          playerStats={playerStats}
          subMinuteMap={subMinuteMap}
        />
      </div>
    </>
  );
});
