import logging
from typing import Optional

from sqlalchemy.orm import Session

from app.models.ticker_entry import TickerEntry
from app.schemas.ticker_entry import TickerEntryCreate, TickerEntryUpdate

logger = logging.getLogger(__name__)


class TickerEntryRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    _PHASE_ORDER = {
        "Before":               0,
        "FirstHalf":            1,
        "FirstHalfBreak":       2,
        "SecondHalf":           3,
        "SecondHalfBreak":      4,
        "ExtraFirstHalf":       5,
        "ExtraBreak":           6,
        "ExtraSecondHalf":      7,
        "ExtraSecondHalfBreak": 8,
        "PenaltyShootout":      9,
        "After":               10,
    }

    def get_by_match(
        self, match_id: int, published_only: bool = True
    ) -> list[TickerEntry]:
        q = self.db.query(TickerEntry).filter(TickerEntry.match_id == match_id)
        if published_only:
            q = q.filter(TickerEntry.status == "published")
        entries = q.order_by(TickerEntry.created_at.desc()).all()
        # Primär nach Phase-Reihenfolge sortieren, sekundär nach created_at desc
        # Phase-Start-Events (Anpfiff, 2. HZ) → zuerst in ihrer Minute (0)
        # Phase-End-Events (HZ, Abpfiff) haben eigene Phase-Order → already correct
        # Alle anderen Events → 1
        _PHASE_FIRST = {"FirstHalf", "SecondHalf", "ExtraFirstHalf", "ExtraSecondHalf", "PenaltyShootout"}
        entries.sort(
            key=lambda e: (
                self._PHASE_ORDER.get(e.phase, 5) if e.phase else 5,
                e.minute if e.minute is not None else 999,
                0 if (e.synthetic_event_id is not None and e.phase in _PHASE_FIRST) else 1,
                e.created_at,
            )
        )
        return entries

    def get_by_id(self, entry_id: int) -> Optional[TickerEntry]:
        return self.db.query(TickerEntry).filter(TickerEntry.id == entry_id).first()

    def get_by_event(self, event_id: int) -> Optional[TickerEntry]:
        return (
            self.db.query(TickerEntry)
            .filter(
                TickerEntry.event_id == event_id,
                TickerEntry.status != "rejected",
            )
            .first()
        )

    def delete(self, entry_id: int) -> bool:
        entry = self.get_by_id(entry_id)
        if not entry:
            return False
        self.db.delete(entry)
        self.db.commit()
        return True

    def create(self, data: TickerEntryCreate) -> TickerEntry:
        entry = TickerEntry(**data.model_dump())
        self.db.add(entry)
        self.db.commit()
        self.db.refresh(entry)
        logger.debug("TickerEntry created: id=%s match_id=%s", entry.id, entry.match_id)
        return entry

    def update(self, entry_id: int, data: TickerEntryUpdate) -> Optional[TickerEntry]:
        entry = self.get_by_id(entry_id)
        if not entry:
            return None
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(entry, field, value)
        self.db.commit()
        self.db.refresh(entry)
        logger.debug("TickerEntry updated: id=%s status=%s", entry.id, entry.status)
        return entry
