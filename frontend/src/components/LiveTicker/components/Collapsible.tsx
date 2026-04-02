import { memo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

/* ── CollapsibleBase (internal) ─────────────────────────────── */

interface CollapsibleBaseProps {
  title: ReactNode;
  defaultOpen?: boolean;
  wrapperClass?: string;
  wrapperStyle?: CSSProperties;
  titleClass?: string;
  titleStyle?: CSSProperties;
  mountContent: boolean;
  count?: number | null;
  actions?: ReactNode;
  onToggle?: (open: boolean) => void;
  headerAs?: "button" | "div";
  arrowClass?: string;
  arrowStyle?: CSSProperties;
  children?: ReactNode;
}

function CollapsibleBase({
  title,
  defaultOpen,
  wrapperClass,
  wrapperStyle,
  titleClass,
  titleStyle,
  mountContent,
  count,
  actions,
  onToggle,
  headerAs = "button",
  arrowClass,
  arrowStyle,
  children,
}: CollapsibleBaseProps) {
  const [open, setOpen] = useState(defaultOpen);

  const handleToggle = () => {
    setOpen((o) => {
      const next = !o;
      onToggle?.(next);
      return next;
    });
  };

  const hasExtras = count != null || actions;
  const HeaderTag = headerAs;

  return (
    <div className={wrapperClass} style={wrapperStyle}>
      <HeaderTag
        className={titleClass}
        style={titleStyle}
        onClick={handleToggle}
      >
        {hasExtras ? (
          <>
            <span>
              {title}
              {count != null ? ` (${count})` : ""}
            </span>
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
              onClick={(e) => e.stopPropagation()}
            >
              {actions}
              <span className={arrowClass} style={arrowStyle}>
                {open ? "\u25B2" : "\u25BC"}
              </span>
            </div>
          </>
        ) : (
          <>
            {title}
            <span className={arrowClass} style={arrowStyle}>
              {open ? "\u25B2" : "\u25BC"}
            </span>
          </>
        )}
      </HeaderTag>
      {mountContent ? (
        open ? (
          children
        ) : null
      ) : (
        <div style={{ display: open ? undefined : "none" }}>{children}</div>
      )}
    </div>
  );
}

/* ── Collapsible (right panel variant) ─────────────────────── */

interface CollapsibleProps {
  title: ReactNode;
  defaultOpen?: boolean;
  children?: ReactNode;
}

export const Collapsible = memo(function Collapsible({
  title,
  defaultOpen = true,
  children,
}: CollapsibleProps) {
  return (
    <CollapsibleBase
      title={title}
      defaultOpen={defaultOpen}
      wrapperClass="lt-right__section"
      titleClass="lt-right__section-title lt-collapsible-hd"
      arrowClass="lt-collapsible-hd__arrow"
      mountContent={false}
    >
      {children}
    </CollapsibleBase>
  );
});

/* ── CollapsibleCat (category variant) ─────────────────────── */

export const CollapsibleCat = memo(function CollapsibleCat({
  title,
  defaultOpen = true,
  children,
}: CollapsibleProps) {
  return (
    <CollapsibleBase
      title={title}
      defaultOpen={defaultOpen}
      wrapperClass="lt-pcat"
      titleClass="lt-pcat__hd-label lt-collapsible-hd"
      arrowClass="lt-collapsible-hd__arrow"
      mountContent={true}
    >
      {children}
    </CollapsibleBase>
  );
});

/* ── CollapsibleSection (center panel variant) ─────────────── */

interface CollapsibleSectionProps {
  title: ReactNode;
  count?: number | null;
  actions?: ReactNode;
  defaultOpen?: boolean;
  onToggle?: (open: boolean) => void;
  children?: ReactNode;
}

export function CollapsibleSection({
  title,
  count,
  actions,
  defaultOpen = true,
  onToggle,
  children,
}: CollapsibleSectionProps) {
  return (
    <CollapsibleBase
      title={title}
      defaultOpen={defaultOpen}
      wrapperStyle={{ marginBottom: "1rem" }}
      titleClass="lt-center__section-title"
      titleStyle={{
        cursor: "pointer",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "0.5rem",
      }}
      mountContent={true}
      count={count}
      actions={actions}
      onToggle={onToggle}
      headerAs="div"
      arrowStyle={{ fontSize: "0.65rem", opacity: 0.5, pointerEvents: "none" }}
    >
      {children}
    </CollapsibleBase>
  );
}
