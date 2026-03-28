import { memo, useState } from "react";
import type { ReactNode } from "react";

interface CollapsibleBaseProps {
  title: ReactNode;
  defaultOpen?: boolean;
  wrapperClass: string;
  titleClass: string;
  mountContent: boolean;
  children?: ReactNode;
}

function CollapsibleBase({ title, defaultOpen, wrapperClass, titleClass, mountContent, children }: CollapsibleBaseProps) {
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

interface CollapsibleProps { title: ReactNode; defaultOpen?: boolean; children?: ReactNode; }

export const Collapsible: any = memo(function Collapsible({ title, defaultOpen = true, children }: CollapsibleProps) {
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

export const CollapsibleCat: any = memo(function CollapsibleCat({ title, defaultOpen = true, children }: CollapsibleProps) {
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

