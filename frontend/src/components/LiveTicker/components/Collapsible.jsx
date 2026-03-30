import { memo, useState } from "react";
import PropTypes from "prop-types";

function CollapsibleBase({ title, defaultOpen, wrapperClass, titleClass, mountContent, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={wrapperClass}>
      <button className={titleClass} onClick={() => setOpen((o) => !o)}>
        {title}
        <span className="lt-collapsible-hd__arrow">{open ? "▲" : "▼"}</span>
      </button>
      {mountContent
        ? (open ? children : null)
        : <div style={{ display: open ? undefined : "none" }}>{children}</div>
      }
    </div>
  );
}

CollapsibleBase.propTypes = {
  title: PropTypes.string.isRequired,
  defaultOpen: PropTypes.bool,
  wrapperClass: PropTypes.string.isRequired,
  titleClass: PropTypes.string.isRequired,
  mountContent: PropTypes.bool,
  children: PropTypes.node,
};

export const Collapsible = memo(function Collapsible({ title, defaultOpen = true, children }) {
  return (
    <CollapsibleBase
      title={title}
      defaultOpen={defaultOpen}
      wrapperClass="lt-right__section"
      titleClass="lt-right__section-title lt-collapsible-hd"
      mountContent={false}
    >
      {children}
    </CollapsibleBase>
  );
});

Collapsible.propTypes = {
  title: PropTypes.string.isRequired,
  defaultOpen: PropTypes.bool,
  children: PropTypes.node,
};

export const CollapsibleCat = memo(function CollapsibleCat({ title, defaultOpen = true, children }) {
  return (
    <CollapsibleBase
      title={title}
      defaultOpen={defaultOpen}
      wrapperClass="lt-pcat"
      titleClass="lt-pcat__hd-label lt-collapsible-hd"
      mountContent={true}
    >
      {children}
    </CollapsibleBase>
  );
});

CollapsibleCat.propTypes = {
  title: PropTypes.string.isRequired,
  defaultOpen: PropTypes.bool,
  children: PropTypes.node,
};
