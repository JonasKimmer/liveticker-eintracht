import {
  useState,
  useCallback,
  useRef,
  useMemo,
  useEffect,
  type FormEvent,
} from "react";
import { useLiveMinuteEditor } from "../../hooks/useLiveMinuteEditor";
import { generateMediaCaption, publishMedia } from "api";
import { parseCommand } from "../../utils/parseCommand";
import { useCommandPalette, CommandPalettePortal } from "../entry/CommandPalette";
import { MinuteEditor } from "../entry/MinuteEditor";
import { useNameAutocomplete } from "../../hooks/useNameAutocomplete";
import { PublishModalShell } from "../PublishModalShell";
import { PUBLISH_PHASES as PHASES } from "../../constants";

interface MediaPublishModalProps {
  image: {
    media_id: string | number;
    thumbnail_url?: string | null;
    name?: string | null;
  };
  matchId: number;
  onClose: () => void;
  onPublished: (mediaId: string | number) => void;
  playerNames?: string[];
  currentMinute?: number;
}

export function MediaPublishModal({
  image,
  matchId,
  onClose,
  onPublished,
  playerNames = [],
  currentMinute = 0,
}: MediaPublishModalProps) {
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Live minute — syncs from prop, ticks every 60s, can be manually overridden
  const {
    minute,
    setMinute,
    minuteEditing,
    setMinuteEditing,
    minuteOverride,
    setMinuteOverride,
  } = useLiveMinuteEditor(currentMinute);

  const {
    showPalette,
    paletteIdx,
    filteredCmds,
    onValueChange,
    selectCmd: selectCmdPalette,
    handlePaletteKeyDown,
  } = useCommandPalette(description);
  const preview = useMemo(() => {
    if (!description.trim().startsWith("/")) return null;
    return parseCommand(description.trim(), minute);
  }, [description, minute]);

  const {
    lastWord,
    nameSuggestions,
    showNames,
    nameIdx,
    setNameIdx,
    selectName,
  } = useNameAutocomplete(description, playerNames, {
    showPalette,
    onReplace: setDescription,
    inputRef: textareaRef,
  });

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !showPalette && !showNames) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, showPalette, showNames]);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await generateMediaCaption(Number(image.media_id));
      setDescription(res.data.text);
      textareaRef.current?.focus();
    } catch {
      setError("KI-Generierung fehlgeschlagen.");
    } finally {
      setGenerating(false);
    }
  }, [image.media_id]);

  const handleChange = useCallback(
    (v: string) => {
      setDescription(v);
      onValueChange(v);
    },
    [onValueChange],
  );

  const handleSubmit = useCallback(
    async (e?: FormEvent) => {
      e?.preventDefault();
      if (!description.trim()) {
        setError("Text darf nicht leer sein.");
        return;
      }
      const raw = description.trim();
      let textToPublish = raw;
      let icon = null;
      if (raw.startsWith("/")) {
        const parsed = parseCommand(raw, minute);
        icon = parsed.meta?.icon ?? null;
        textToPublish = raw.replace(/^\/\w+\s*/, "").trim() || raw;
      }
      setLoading(true);
      setError(null);
      try {
        const publishMinute = phase === "Halftime" ? 45 : phase ? null : minute || null;
        await publishMedia({
          mediaId: Number(image.media_id),
          description: textToPublish,
          matchId,
          minute: publishMinute,
          phase: phase || null,
          icon,
        });
        onPublished(image.media_id);
      } catch (err) {
        setError(err.response?.data?.detail || err.message);
        setLoading(false);
      }
    },
    [description, minute, image.media_id, matchId, onPublished],
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (handlePaletteKeyDown(e, setDescription)) return;
      if (showNames) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setNameIdx((i) => Math.min(i + 1, nameSuggestions.length - 1));
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setNameIdx((i) => Math.max(i - 1, 0));
          return;
        }
        if (e.key === "Tab" || e.key === "Enter") {
          if (nameSuggestions[nameIdx]) {
            e.preventDefault();
            selectName(nameSuggestions[nameIdx]);
            return;
          }
        }
        if (e.key === "Escape") {
          return;
        }
      }
      if (
        e.key === "Enter" &&
        !e.ctrlKey &&
        !e.shiftKey &&
        description.trim().startsWith("/")
      ) {
        if (preview?.isValid) {
          e.preventDefault();
          setDescription(preview.formatted);
        }
        return;
      }
      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      }
    },
    [
      handlePaletteKeyDown,
      showNames,
      nameSuggestions,
      nameIdx,
      description,
      preview,
      selectName,
      handleSubmit,
    ],
  );

  const imagePreview = image.thumbnail_url ? (
    <div
      style={{
        position: "relative",
        aspectRatio: "16/7",
        overflow: "hidden",
      }}
    >
      <img
        src={image.thumbnail_url}
        alt={image.name}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to top, var(--lt-bg-card) 0%, transparent 60%)",
        }}
      />
      <span
        style={{
          position: "absolute",
          bottom: 8,
          left: 12,
          fontFamily: "var(--lt-font-mono)",
          fontSize: "0.65rem",
          color: "var(--lt-text-muted)",
          maxWidth: "80%",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {image.name || `media_id: ${image.media_id}`}
      </span>
    </div>
  ) : undefined;

  return (
    <PublishModalShell
      onClose={onClose}
      onSubmit={handleSubmit}
      error={error}
      text={generating ? "✦ Generiere…" : description}
      onTextChange={handleChange}
      textareaRef={textareaRef}
      textareaDisabled={generating}
      textareaStyle={{
        color: generating ? "var(--lt-text-muted)" : "var(--lt-text)",
      }}
      onKeyDown={handleKeyDown}
      submitLabel="✓ Im Ticker veröffentlichen"
      submitDisabled={loading || !description.trim()}
      submitting={loading}
      cardStyle={{ maxWidth: 420 }}
      preview={imagePreview}
      labelExtra={
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          style={{
            fontFamily: "var(--lt-font-mono)",
            fontSize: "0.62rem",
            color: "var(--lt-accent)",
            background: "none",
            border: "none",
            cursor: generating ? "not-allowed" : "pointer",
            padding: 0,
            opacity: generating ? 0.5 : 1,
          }}
        >
          {generating ? "…" : "✦ KI-Text"}
        </button>
      }
      extraControls={
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <select
            value={phase}
            onChange={(e) => setPhase(e.target.value)}
            className="lt-form-input"
          >
            {PHASES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          {!phase && (
            <MinuteEditor
              minute={minute}
              setMinute={setMinute}
              minuteEditing={minuteEditing}
              setMinuteEditing={setMinuteEditing}
              minuteOverride={minuteOverride}
              setMinuteOverride={setMinuteOverride}
              currentMinute={currentMinute}
            />
          )}
        </div>
      }
      hintContent={
        !description ? (
          <div
            style={{
              fontFamily: "var(--lt-font-mono)",
              fontSize: "0.65rem",
              color: "var(--lt-text-faint)",
              marginTop: 4,
            }}
          >
            <span style={{ color: "var(--lt-accent)" }}>↵</span>{" "}
            Veröffentlichen ·{" "}
            <span style={{ color: "var(--lt-accent)" }}>/?</span> alle
            Commands
          </div>
        ) : null
      }
    >
      {/* Command palette */}
      <CommandPalettePortal
        show={showPalette}
        items={filteredCmds}
        activeIdx={paletteIdx}
        anchorRef={textareaRef}
        onSelect={(cmd) => {
          selectCmdPalette(cmd, setDescription);
          setTimeout(() => textareaRef.current?.focus(), 0);
        }}
      />

      {/* Name suggestions */}
      {showNames && (
        <div className="lt-cmd-palette lt-name-palette">
          {nameSuggestions.map((name, i) => {
            const q = lastWord.toLowerCase();
            const lname = name.toLowerCase();
            const matchIdx = lname.indexOf(q);
            const before = name.slice(0, matchIdx);
            const match = name.slice(matchIdx, matchIdx + q.length);
            const after = name.slice(matchIdx + q.length);
            return (
              <div
                key={name}
                className={`lt-cmd-palette__item${i === nameIdx ? " lt-cmd-palette__item--active" : ""}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectName(name);
                }}
              >
                <span className="lt-cmd-palette__icon">👤</span>
                <span className="lt-cmd-palette__cmd">
                  {before}
                  <strong>{match}</strong>
                  {after}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </PublishModalShell>
  );
}
