import logging
from typing import Optional

from sqlalchemy.orm import Session

from app.models.ticker_entry import TickerEntry
from app.schemas.ticker_entry import TickerEntryCreate, TickerEntryUpdate

logger = logging.getLogger(__name__)


class TickerEntryRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_match(
        self, match_id: int, published_only: bool = True
    ) -> list[TickerEntry]:
        q = self.db.query(TickerEntry).filter(TickerEntry.match_id == match_id)
        if published_only:
            q = q.filter(TickerEntry.status == "published")
        return q.order_by(TickerEntry.created_at.desc()).all()

    def get_by_id(self, entry_id: int) -> Optional[TickerEntry]:
        return self.db.query(TickerEntry).filter(TickerEntry.id == entry_id).first()

    def get_by_event(self, event_id: int) -> Optional[TickerEntry]:
        return (
            self.db.query(TickerEntry).filter(TickerEntry.event_id == event_id).first()
        )

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
