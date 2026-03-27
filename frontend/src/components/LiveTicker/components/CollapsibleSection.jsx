import { useState } from "react";
import PropTypes from "prop-types";

export function CollapsibleSection({
  title,
  count,
  actions,
  defaultOpen = true,
  onToggle,
  children,
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: "1rem" }}>
      <div
        className="lt-center__section-title"
        style={{
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "0.5rem",
        }}
        onClick={() => {
          const next = !open;
          setOpen(next);
          onToggle?.(next);
        }}
      >
        <span>
          {title}
          {count != null ? ` (${count})` : ""}
        </span>
        <div
          style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
          onClick={(e) => e.stopPropagation()}
        >
          {actions}
          <span
            style={{ fontSize: "0.65rem", opacity: 0.5, pointerEvents: "none" }}
          >
            {open ? "▲" : "▼"}
          </span>
        </div>
      </div>
      {open && children}
    </div>
  );
}

CollapsibleSection.propTypes = {
  title: PropTypes.string.isRequired,
  count: PropTypes.number,
  actions: PropTypes.node,
  defaultOpen: PropTypes.bool,
  onToggle: PropTypes.func,
  children: PropTypes.node,
};
