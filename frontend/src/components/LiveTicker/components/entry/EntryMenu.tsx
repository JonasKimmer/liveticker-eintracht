// ============================================================
// EntryMenu.tsx — Drei-Punkte-Menü für Bearbeiten / Löschen
// ============================================================
import React, { useState, useCallback, useRef } from "react";
import { useClickOutside } from "hooks/useClickOutside";

export interface EntryMenuProps {
  onEdit?: ((id: number, text: string) => Promise<void>) | undefined;
  onDelete?: ((id: number) => Promise<void>) | undefined;
  tickerTextId: number;
  startEdit: () => void;
}

export function EntryMenu({
  onEdit,
  onDelete,
  tickerTextId,
  startEdit,
}: EntryMenuProps) {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => {
    setOpen(false);
    setConfirmOpen(false);
  }, []);
  useClickOutside(menuRef, close);

  if (!onEdit && !onDelete) return null;

  return (
    <div
      className={`lt-entry__menu${open ? " lt-entry__menu--open" : ""}`}
      ref={menuRef}
    >
      <button
        className="lt-entry__menu-btn"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        title="Aktionen"
      >
        •••
      </button>
      {open && (
        <div className="lt-entry__menu-dropdown">
          {!confirmOpen ? (
            <>
              {onEdit && (
                <button
                  className="lt-entry__menu-item"
                  onClick={() => {
                    setOpen(false);
                    startEdit();
                  }}
                >
                  ✎ Bearbeiten
                </button>
              )}
              {onDelete && (
                <button
                  className="lt-entry__menu-item lt-entry__menu-item--danger"
                  onClick={() => setConfirmOpen(true)}
                >
                  ✕ Löschen
                </button>
              )}
            </>
          ) : (
            <div className="lt-entry__menu-confirm-view">
              <div className="lt-entry__menu-confirm-title">
                Eintrag löschen?
              </div>
              <div className="lt-entry__menu-confirm-btns">
                <button
                  className="lt-entry__menu-confirm__btn lt-entry__menu-confirm__btn--ok"
                  onClick={() => {
                    onDelete(tickerTextId);
                    setOpen(false);
                    setConfirmOpen(false);
                  }}
                >
                  Löschen
                </button>
                <button
                  className="lt-entry__menu-confirm__btn lt-entry__menu-confirm__btn--cancel"
                  onClick={() => setConfirmOpen(false)}
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
