import { memo } from "react";
import type { LineupEntry, PlayerStat } from "../../../../types";

interface PitchFormationProps {
  homeStarters: LineupEntry[];
  awayStarters: LineupEntry[];
  homeAbbr: string;
  awayAbbr: string;
  playerName: (id: number | undefined | null) => string | null;
  playerStats: PlayerStat[];
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

function interpY(numRows: number, i: number, yStart: number, yEnd: number) {
  if (numRows <= 1) return (yStart + yEnd) / 2;
  return yStart + (i / (numRows - 1)) * (yEnd - yStart);
}

interface PlayerDotProps {
  p: LineupEntry;
  x: number;
  y: number;
  isHome: boolean;
  label: string;
  rating?: number | null;
}

function PlayerDot({ p, x, y, isHome, label, rating }: PlayerDotProps) {
  const colorClass = isHome ? "lt-pitch-dot--home" : "lt-pitch-dot--away";
  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r={4}
        className={`lt-pitch-dot ${colorClass}`}
      />
      <text
        x={x}
        y={y + 0.5}
        textAnchor="middle"
        dominantBaseline="middle"
        className="lt-pitch-num"
      >
        {p.jerseyNumber}
      </text>
      <text x={x} y={y + 7.5} textAnchor="middle" className="lt-pitch-name">
        {label}
      </text>
      {rating != null && (
        <text x={x} y={y + 11} textAnchor="middle" className="lt-pitch-rating">
          {rating.toFixed(1)}
        </text>
      )}
    </g>
  );
}

interface TeamLayerProps {
  rows: LineupEntry[][];
  yStart: number;
  yEnd: number;
  isHome: boolean;
  playerName: (id: number | undefined | null) => string | null;
  playerStats: PlayerStat[];
}

function TeamLayer({ rows, yStart, yEnd, isHome, playerName, playerStats }: TeamLayerProps) {
  return (
    <>
      {rows.map((row, ri) =>
        row.map((p, pi) => {
          const x = row.length === 1 ? 50 : 7 + (pi / (row.length - 1)) * 86;
          const y = interpY(rows.length, ri, yStart, yEnd);
          const name = playerName(p.playerId) ?? "";
          const lastName = name.split(" ").pop() ?? name;
          const label = lastName.length > 8 ? lastName.slice(0, 7) + "…" : lastName || `#${p.jerseyNumber}`;
          const stat = playerStats.find((s) => s.playerId === p.playerId);
          return (
            <PlayerDot
              key={p.id}
              p={p}
              x={x}
              y={y}
              isHome={isHome}
              label={label}
              rating={stat?.rating}
            />
          );
        })
      )}
    </>
  );
}

// Shared pitch markings as SVG defs/group
function PitchMarkings({ w, h }: { w: number; h: number }) {
  const m = 3; // margin
  const cx = w / 2;
  const cy = h / 2;
  const pw = w - m * 2; // pitch width
  const ph = h - m * 2; // pitch height
  const paW = pw * 0.58; // penalty area width (~58% of pitch)
  const paH = ph * 0.16; // penalty area height
  const paX = m + (pw - paW) / 2;
  const sW = pw * 0.34; // 6yd box width
  const sH = ph * 0.075;
  const sX = m + (pw - sW) / 2;

  return (
    <g className="lt-pitch-lines">
      {/* Stripes */}
      {Array.from({ length: 6 }, (_, i) => (
        <rect
          key={i}
          x={m}
          y={m + (i * ph) / 6}
          width={pw}
          height={ph / 6}
          className={i % 2 === 0 ? "lt-pitch-stripe-a" : "lt-pitch-stripe-b"}
        />
      ))}
      {/* Outline */}
      <rect x={m} y={m} width={pw} height={ph} className="lt-pitch-outline" />
      {/* Center line */}
      <line x1={m} y1={cy} x2={w - m} y2={cy} className="lt-pitch-outline" />
      {/* Center circle */}
      <circle cx={cx} cy={cy} r={ph * 0.1} className="lt-pitch-circle" />
      <circle cx={cx} cy={cy} r={0.8} className="lt-pitch-spot" />
      {/* Top penalty area */}
      <rect x={paX} y={m} width={paW} height={paH} className="lt-pitch-area" />
      <rect x={sX} y={m} width={sW} height={sH} className="lt-pitch-area" />
      {/* Bottom penalty area */}
      <rect x={paX} y={h - m - paH} width={paW} height={paH} className="lt-pitch-area" />
      <rect x={sX} y={h - m - sH} width={sW} height={sH} className="lt-pitch-area" />
    </g>
  );
}

function HalfPitchMarkings({ w, h }: { w: number; h: number }) {
  const m = 3;
  const pw = w - m * 2;
  const ph = h - m * 2;
  const paW = pw * 0.58;
  const paH = ph * 0.22;
  const paX = m + (pw - paW) / 2;
  const sW = pw * 0.34;
  const sH = ph * 0.1;
  const sX = m + (pw - sW) / 2;

  return (
    <g className="lt-pitch-lines">
      {Array.from({ length: 3 }, (_, i) => (
        <rect
          key={i}
          x={m}
          y={m + (i * ph) / 3}
          width={pw}
          height={ph / 3}
          className={i % 2 === 0 ? "lt-pitch-stripe-a" : "lt-pitch-stripe-b"}
        />
      ))}
      <rect x={m} y={m} width={pw} height={ph} className="lt-pitch-outline" />
      {/* Midfield line at top */}
      <line x1={m} y1={m} x2={w - m} y2={m} className="lt-pitch-midline" />
      {/* Penalty area at bottom */}
      <rect x={paX} y={h - m - paH} width={paW} height={paH} className="lt-pitch-area" />
      <rect x={sX} y={h - m - sH} width={sW} height={sH} className="lt-pitch-area" />
    </g>
  );
}

// Full pitch: both teams
function FullPitch({ homeRows, awayRows, homeAbbr, awayAbbr, playerName, playerStats }: {
  homeRows: LineupEntry[][];
  awayRows: LineupEntry[][];
  homeAbbr: string;
  awayAbbr: string;
  playerName: (id: number | undefined | null) => string | null;
  playerStats: PlayerStat[];
}) {
  const W = 100;
  const H = 160;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="lt-pitch-svg">
      <rect width={W} height={H} className="lt-pitch-bg" />
      <PitchMarkings w={W} h={H} />
      {/* Labels */}
      <text x={W / 2} y={1.5} textAnchor="middle" className="lt-pitch-team lt-pitch-team--home">
        {homeAbbr}
      </text>
      <text x={W / 2} y={H - 0.5} textAnchor="middle" className="lt-pitch-team lt-pitch-team--away">
        {awayAbbr}
      </text>
      {/* Home: GK top (y≈9), FWD toward center (y≈70) */}
      <TeamLayer
        rows={homeRows}
        yStart={9}
        yEnd={70}
        isHome
        playerName={playerName}
        playerStats={playerStats}
      />
      {/* Away: GK bottom (y≈151), FWD toward center (y≈90) */}
      <TeamLayer
        rows={awayRows}
        yStart={151}
        yEnd={90}
        isHome={false}
        playerName={playerName}
        playerStats={playerStats}
      />
    </svg>
  );
}

// Half pitch: one team
function HalfPitch({ rows, abbr, isHome, playerName, playerStats }: {
  rows: LineupEntry[][];
  abbr: string;
  isHome: boolean;
  playerName: (id: number | undefined | null) => string | null;
  playerStats: PlayerStat[];
}) {
  const W = 100;
  const H = 90;
  const labelClass = isHome
    ? "lt-lineup-team-label lt-lineup-team-label--home"
    : "lt-lineup-team-label lt-lineup-team-label--away";
  return (
    <div>
      <div className={labelClass}>{abbr}</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="lt-pitch-svg">
        <rect width={W} height={H} className="lt-pitch-bg" />
        <HalfPitchMarkings w={W} h={H} />
        {/* GK at bottom (y≈82), FWD at top (y≈10) */}
        <TeamLayer
          rows={rows}
          yStart={82}
          yEnd={10}
          isHome={isHome}
          playerName={playerName}
          playerStats={playerStats}
        />
      </svg>
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
}: PitchFormationProps) {
  const homeRows = getRows(homeStarters);
  const awayRows = getRows(awayStarters);

  return (
    <>
      {/* Narrow: one full pitch */}
      <div className="lt-pitch-full">
        <FullPitch
          homeRows={homeRows}
          awayRows={awayRows}
          homeAbbr={homeAbbr}
          awayAbbr={awayAbbr}
          playerName={playerName}
          playerStats={playerStats}
        />
      </div>
      {/* Wide: two half pitches */}
      <div className="lt-pitch-halves">
        <HalfPitch
          rows={homeRows}
          abbr={homeAbbr}
          isHome
          playerName={playerName}
          playerStats={playerStats}
        />
        <HalfPitch
          rows={awayRows}
          abbr={awayAbbr}
          isHome={false}
          playerName={playerName}
          playerStats={playerStats}
        />
      </div>
    </>
  );
});
