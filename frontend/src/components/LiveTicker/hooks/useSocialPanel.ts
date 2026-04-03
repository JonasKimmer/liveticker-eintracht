import { useState, useCallback, useEffect } from "react";
import { deleteClip } from "api";
import type { Clip } from "../../../types";

type StatusMsg = { type: "error" | "success"; text: string };

/**
 * useSocialPanel
 *
 * Shared state + logic for Instagram and Twitter panels.
 *
 * @param fetchFn   – API call to load posts (e.g. fetchInstagramPosts)
 * @param importFn  – API call to trigger n8n import
 */
export function useSocialPanel(
  fetchFn: () => Promise<{ data: Clip[] }>,
  importFn: () => Promise<unknown>,
) {
  const [open, setOpen] = useState(false);
  const [posts, setPosts] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [modalPost, setModalPost] = useState<Clip | null>(null);
  const [statusMsg, setStatusMsg] = useState<StatusMsg | null>(null);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetchFn();
      // Normalize snake_case API fields to camelCase (e.g. thumbnail_url → thumbnailUrl)
      const normalized = (res.data ?? []).map((p: Clip & { thumbnail_url?: string | null }) => ({
        ...p,
        thumbnailUrl: p.thumbnailUrl ?? p.thumbnail_url ?? null,
      }));
      setPosts(normalized);
    } catch {
      setStatusMsg({ type: "error", text: "Fehler beim Laden der Posts." });
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    if (!open) return;
    loadPosts();
  }, [open, loadPosts]);

  const handleImport = useCallback(async () => {
    setImporting(true);
    setStatusMsg(null);
    try {
      await importFn();
      setStatusMsg({
        type: "success",
        text: "Import gestartet – lade in 3s neu…",
      });
      setTimeout(() => loadPosts(), 3000);
    } catch {
      setStatusMsg({
        type: "error",
        text: "n8n-Workflow konnte nicht gestartet werden.",
      });
    } finally {
      setImporting(false);
    }
  }, [importFn, loadPosts]);

  const handlePublished = useCallback((postId: number) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    setModalPost(null);
    setStatusMsg({ type: "success", text: "✓ Im Liveticker veröffentlicht!" });
  }, []);

  const handleDelete = useCallback(async (postId: number) => {
    try {
      await deleteClip(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch {
      setStatusMsg({ type: "error", text: "Löschen fehlgeschlagen." });
    }
  }, []);

  // Auto-dismiss success messages after 3 s
  useEffect(() => {
    if (!statusMsg || statusMsg.type !== "success") return;
    const id = setTimeout(() => setStatusMsg(null), 3000);
    return () => clearTimeout(id);
  }, [statusMsg]);

  return {
    open,
    setOpen,
    posts,
    loading,
    importing,
    modalPost,
    setModalPost,
    statusMsg,
    loadPosts,
    handleImport,
    handlePublished,
    handleDelete,
  };
}
