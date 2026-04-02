// ============================================================
// ClipPickerPanel.tsx — Persistente Tor-Clips aus DB
// Flow: Clips aus DB laden → Klick → Modal mit KI-Entwurf → Ticker
// ============================================================

import { memo, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { fetchClips, fetchGoalClips, deleteClip } from "api";
import { PickerPanelShell } from "../PickerPanelShell";
import { ClipThumbnail } from "./ClipThumbnail";
import { ClipPublishModal } from "./ClipPublishModal";

// ── Lokale Typen ────────────────────────────────────────────

type StatusMsg = { type: "error" | "success"; text: string };

interface ClipData {
  id: string | number;
  player_name?: string | null;
  video_url?: string | null;
  thumbnail_url?: string | null;
  _fromN8n?: boolean;
  [key: string]: unknown;
}

// ── Hauptkomponente ───────────────────────────────────────────

interface ClipPickerPanelProps {
  matchId: number;
  match?: {
    homeTeam?: { name: string } | null;
    awayTeam?: { name: string } | null;
  } | null;
  currentMinute?: number;
  onPublished?: () => void;
}

export const ClipPickerPanel = memo(function ClipPickerPanel({
  matchId,
  match,
  currentMinute = 0,
  onPublished,
}: ClipPickerPanelProps) {
  const [open, setOpen] = useState(false);
  const [clips, setClips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [modalClip, setModalClip] = useState<ClipData | null>(null);
  const [statusMsg, setStatusMsg] = useState<StatusMsg | null>(null);
  const [teamFilter, setTeamFilter] = useState("");

  // Clips laden: erst DB, bei leer/Fehler → n8n Fallback
  const loadClips = useCallback(async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetchClips(matchId, teamFilter || undefined);
      const dbClips = res.data ?? [];
      if (dbClips.length > 0) {
        setClips(dbClips);
        setLoading(false);
        return;
      }
    } catch {
      /* DB nicht erreichbar → n8n Fallback */
    }

    // Fallback: direkt von n8n laden (alter Workflow oder DB noch leer)
    try {
      const res = await fetchGoalClips(matchId);
      const raw = res.data;
      const list = Array.isArray(raw) ? raw : (raw?.items ?? []);
      const n8nClips = list.map((item, i) => ({
        id: `n8n_${i}`,
        vid: item?.json?.vid ?? item?.vid,
        video_url: item?.json?.vid
          ? `https://cdn.jwplayer.com/players/${item.json.vid}.html`
          : (item?.videoUrl ?? ""),
        thumbnail_url: item?.json?.thumbnail ?? item?.thumbnail,
        player_name: item?.json?.player ?? item?.player ?? item?.title,
        title: item?.json?.player ?? item?.player ?? item?.title,
        team_name: null,
        published: false,
        _fromN8n: true,
      }));
      setClips(n8nClips);
      if (n8nClips.length > 0) {
        setStatusMsg({
          type: "success",
          text: "Clips aus n8n geladen – Backend neu starten um DB zu aktivieren",
        });
      }
    } catch {
      setStatusMsg({ type: "error", text: "Keine Clips gefunden." });
    } finally {
      setLoading(false);
    }
  }, [matchId, teamFilter]);

  // Clips laden wenn Panel aufgeht
  useEffect(() => {
    if (!open) return;
    loadClips();
  }, [open, loadClips]);

  const handleImport = useCallback(async () => {
    setImporting(true);
    setStatusMsg(null);
    try {
      await fetchGoalClips(matchId);
      setStatusMsg({ type: "success", text: "Import gestartet – lade Clips…" });
      setTimeout(() => loadClips(), 2500);
    } catch {
      setStatusMsg({
        type: "error",
        text: "n8n-Workflow konnte nicht gestartet werden.",
      });
    } finally {
      setImporting(false);
    }
  }, [matchId, loadClips]);

  const handlePublished = useCallback(
    (clipId) => {
      setClips((prev) => prev.filter((c) => c.id !== clipId));
      setModalClip(null);
      onPublished?.();
      setStatusMsg({
        type: "success",
        text: "✓ Im Liveticker veröffentlicht!",
      });
    },
    [onPublished],
  );

  const handleDelete = useCallback(
    async (clipId) => {
      const clip = clips.find((c) => c.id === clipId);
      if (clip?._fromN8n) {
        setClips((prev) => prev.filter((c) => c.id !== clipId));
        return;
      }
      try {
        await deleteClip(clipId);
        setClips((prev) => prev.filter((c) => c.id !== clipId));
      } catch {
        setStatusMsg({ type: "error", text: "Löschen fehlgeschlagen." });
      }
    },
    [clips],
  );

  // Auto-dismiss Status-Meldung nach 3s
  useEffect(() => {
    if (!statusMsg || statusMsg.type !== "success") return;
    const id = setTimeout(() => setStatusMsg(null), 3000);
    return () => clearTimeout(id);
  }, [statusMsg]);

  // Team-Filter neu laden wenn Filter sich ändert
  useEffect(() => {
    if (!open) return;
    loadClips();
  }, [teamFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Team-Namen aus Match ableiten für Filter-Buttons
  const teams = [match?.homeTeam?.name, match?.awayTeam?.name].filter(Boolean);

  return (
    <>
      {modalClip &&
        createPortal(
          <ClipPublishModal
            clip={modalClip}
            matchId={matchId}
            currentMinute={currentMinute}
            onClose={() => setModalClip(null)}
            onPublished={handlePublished}
          />,
          document.body,
        )}

      <PickerPanelShell
        open={open}
        onToggle={() => setOpen((v) => !v)}
        icon="🎬"
        label="Clips"
        badgeCount={clips.length}
        badgeBackground="var(--lt-accent)"
        importing={importing}
        loading={loading}
        onImport={handleImport}
        onRefresh={loadClips}
        importLabel="↓ Clips importieren"
        importBackground="var(--lt-accent)"
        emptyLabel="Keine Clips – erst importieren"
        hintLabel="Klick → KI-Entwurf + Veröffentlichen"
        statusMsg={statusMsg}
      >
        {/* Team-Filter */}
        {teams.length > 0 && (
          <div style={{ gridColumn: "1 / -1", display: "flex", gap: 4 }}>
            <button
              onClick={() => setTeamFilter("")}
              style={{
                padding: "0.3rem 0.6rem",
                borderRadius: 4,
                border: "1px solid var(--lt-border)",
                background: !teamFilter
                  ? "var(--lt-accent)"
                  : "transparent",
                color: !teamFilter ? "#0d0d0d" : "var(--lt-text-muted)",
                fontFamily: "var(--lt-font-mono)",
                fontSize: "0.62rem",
                cursor: "pointer",
              }}
            >
              Alle
            </button>
            {teams.map((t) => (
              <button
                key={t}
                onClick={() => setTeamFilter(t)}
                style={{
                  padding: "0.3rem 0.6rem",
                  borderRadius: 4,
                  border: "1px solid var(--lt-border)",
                  background:
                    teamFilter === t ? "var(--lt-accent)" : "transparent",
                  color:
                    teamFilter === t ? "#0d0d0d" : "var(--lt-text-muted)",
                  fontFamily: "var(--lt-font-mono)",
                  fontSize: "0.62rem",
                  cursor: "pointer",
                  maxWidth: 80,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={t}
              >
                {t}
              </button>
            ))}
          </div>
        )}
        {clips.map((clip) => (
          <ClipThumbnail
            key={clip.id}
            clip={clip}
            onClick={setModalClip}
            onDelete={handleDelete}
          />
        ))}
      </PickerPanelShell>
    </>
  );
});
