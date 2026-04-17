import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { useClickOutside } from "hooks/useClickOutside";
import { useListKeyboard } from "hooks/useListKeyboard";
import { knockoutThreshold, makeRoundLabel } from "utils/roundLabel";
import type { Match } from "../../../../types";

interface MatchdayPickerProps {
  matchdays: number[];
  matchdaysLoading?: boolean;
  matchdaysError?: string | null;
  selRound: number | null;
  onRoundChange: (r: number) => void;
  matches: Match[];
  onMatchChange: (id: number) => void;
  disabled?: boolean;
}

export function MatchdayPicker({
  matchdays,
  matchdaysLoading,
  matchdaysError,
  selRound,
  onRoundChange,
  matches,
  onMatchChange,
  disabled,
}: MatchdayPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const matchItemRefs = useRef<HTMLElement[]>([]);
  const hasAutoOpenedRef = useRef(false);
  const mouseIsDownRef = useRef(false);
  const { short: roundShort, full: roundFull } = useMemo(
    () => makeRoundLabel(matchdays),
    [matchdays],
  );

  const sortedMatchdays = useMemo(() => {
    const threshold = knockoutThreshold(matchdays);
    const group = matchdays.filter((r) => r <= threshold).sort((a, b) => a - b);
    // Explizite Phasen-Reihenfolge: frühere Runde = kleinere Zahl
    // Standardcodes (64→1/64, 32→1/32, ..., 2/1→Finale) und Sondercodes (97=PO, ..., 103=FIN)
    const KO_PHASE: Record<number, number> = {
      64: 1, 32: 2, 16: 3, 8: 4, 4: 5, 2: 6, 1: 7,
      97: 8, 98: 9, 99: 10, 100: 11, 101: 12, 102: 13, 103: 14,
    };
    const knockout = matchdays
      .filter((r) => r > threshold)
      .sort((a, b) => (KO_PHASE[a] ?? 99) - (KO_PHASE[b] ?? 99));
    return [...group, ...knockout];
  }, [matchdays]);

  // Nur beim ersten Laden auto-öffnen, nicht wenn disabled oder leer
  useEffect(() => {
    if (matchdays.length > 0 && !disabled && !hasAutoOpenedRef.current) {
      setOpen(true);
      hasAutoOpenedRef.current = true;
    }
  }, [matchdays, disabled]);

  // Schließen + Reset wenn Picker deaktiviert wird (kein Wettbewerb gewählt)
  useEffect(() => {
    if (disabled) {
      setOpen(false);
      hasAutoOpenedRef.current = false;
    }
  }, [disabled]);
  useClickOutside(ref, () => setOpen(false));
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  const handleMatchSelect = useCallback(
    (matchId: number) => {
      onMatchChange(matchId);
      setOpen(false);
    },
    [onMatchChange],
  );
  const matchIds = useMemo(() => matches.map((m) => m.id), [matches]);
  const { activeIdx: matchActiveIdx, onKeyDown: matchOnKeyDown } =
    useListKeyboard(matchIds, {
      onSelect: handleMatchSelect,
      onClose: () => setOpen(false),
    });

  useEffect(() => {
    matchItemRefs.current[matchActiveIdx]?.scrollIntoView({ block: "nearest" });
  }, [matchActiveIdx]);

  function handlePanelWheel(e: React.WheelEvent<HTMLDivElement>) {
    e.preventDefault();
    const idx = sortedMatchdays.indexOf(selRound);
    const next =
      e.deltaY > 0
        ? sortedMatchdays[Math.min(idx + 1, sortedMatchdays.length - 1)]
        : sortedMatchdays[Math.max(idx - 1, 0)];
    if (next !== undefined && next !== selRound) onRoundChange(next);
  }

  function handlePanelKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
      e.preventDefault();
      const idx = sortedMatchdays.indexOf(selRound);
      let step = 1;
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        const gridEl = panelRef.current?.querySelector(".lt-mdp__grid");
        if (gridEl) {
          const btns = Array.from(
            gridEl.querySelectorAll<HTMLElement>(".lt-mdp__day"),
          );
          if (btns.length >= 2) {
            const firstTop = btns[0].getBoundingClientRect().top;
            let cols = 1;
            for (let i = 1; i < btns.length; i++) {
              if (Math.abs(btns[i].getBoundingClientRect().top - firstTop) > 4)
                break;
              cols++;
            }
            step = cols;
          }
        }
      }
      const next =
        e.key === "ArrowRight" || e.key === "ArrowDown"
          ? sortedMatchdays[Math.min(idx + step, sortedMatchdays.length - 1)]
          : sortedMatchdays[Math.max(idx - step, 0)];
      if (next !== undefined) onRoundChange(next);
    } else {
      matchOnKeyDown(e);
    }
  }

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
          onMouseDown={() => { mouseIsDownRef.current = true; }}
          onClick={() => setOpen((v) => !v)}
          onFocus={() => {
            // Nur bei Tastatur-Fokus (Tab/Enter-Advance) öffnen, nicht bei Mausklick
            if (!mouseIsDownRef.current && !disabled && matchdays.length) setOpen(true);
            mouseIsDownRef.current = false;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !open && !disabled && matchdays.length) {
              e.preventDefault();
              setOpen(true);
            }
          }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>{label}</span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{
              flexShrink: 0,
              transition: "transform 0.15s",
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
            }}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>

      {open && (
        <div
          className="lt-mdp__panel"
          ref={panelRef}
          tabIndex={-1}
          onKeyDown={handlePanelKeyDown}
          onWheel={handlePanelWheel}
          style={{ outline: "none" }}
        >
          {matchdays.length > 0 && (
            <div className="lt-mdp__grid">
              {sortedMatchdays.map((r) => (
                <button
                  key={r}
                  className={`lt-mdp__day${selRound === r ? " lt-mdp__day--active" : ""}`}
                  onClick={() => onRoundChange(r)}
                  title="← → Pfeiltasten zum Wechseln"
                >
                  {roundShort(r)}
                </button>
              ))}
            </div>
          )}

          {selRound && (
            <div className="lt-mdp__matches">
              {matches.length === 0 ? (
                <div className="lt-mdp__empty">
                  Keine Spiele für diesen Spieltag
                </div>
              ) : (
                <>
                  <div
                    style={{
                      padding: "0.25rem 0.75rem 0.1rem",
                      fontSize: "0.68rem",
                      color: "var(--lt-text-muted)",
                      fontFamily: "var(--lt-font-mono)",
                    }}
                  >
                    ↑↓ navigieren · Enter auswählen · ←/→ Spieltag wechseln
                  </div>
                  {matches.map((m, idx) => (
                    <button
                      key={m.id}
                      ref={(el) => {
                        matchItemRefs.current[idx] = el;
                      }}
                      className="lt-mdp__match"
                      style={
                        matchActiveIdx === idx
                          ? {
                              outline: "1px solid var(--lt-accent)",
                              background: "var(--lt-accent-dim)",
                              borderRadius: 4,
                            }
                          : undefined
                      }
                      onClick={() => handleMatchSelect(m.id)}
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
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
