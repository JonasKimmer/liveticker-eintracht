import logging
from typing import Optional

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.event import Event
from app.schemas.event import EventCreate, EventUpdate

logger = logging.getLogger(__name__)


class EventRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_match_paginated(
        self, match_id: int, page: int = 1, page_size: int = 50
    ) -> tuple[list[Event], int]:
        q = (
            self.db.query(Event)
            .filter(Event.match_id == match_id)
            .order_by(Event.position, Event.time)
        )
        total = q.count()
        items = q.offset((page - 1) * page_size).limit(page_size).all()
        return items, total

    def get_by_id(self, event_id: int) -> Optional[Event]:
        return self.db.query(Event).filter(Event.id == event_id).first()

    def get_by_source_id(self, source_id: str) -> Optional[Event]:
        return self.db.query(Event).filter(Event.source_id == source_id).first()

    def upsert(self, match_id: int, data: EventCreate) -> tuple[Event, bool]:
        """Insert or update by source_id. Falls back to insert if no source_id."""
        if data.source_id:
            existing = self.get_by_source_id(data.source_id)
            if existing:
                update_data = data.model_dump(exclude_unset=True, by_alias=False)
                update_data.pop("source_id", None)
                update_data.pop("players", None)
                for field, value in update_data.items():
                    setattr(existing, field, value)
                try:
                    self.db.commit()
                    self.db.refresh(existing)
                except IntegrityError:
                    self.db.rollback()
                    raise
                return existing, False

        data_dict = data.model_dump(exclude_unset=True, by_alias=False)
        data_dict.pop("players", None)
        event = Event(match_id=match_id, **data_dict)
        self.db.add(event)
        try:
            self.db.commit()
            self.db.refresh(event)
            logger.debug("Event created: id=%s source_id=%s", event.id, event.source_id)
        except IntegrityError:
            self.db.rollback()
            raise
        return event, True

    def update_by_source_id(self, source_id: str, data: EventUpdate) -> Optional[Event]:
        event = self.get_by_source_id(source_id)
        if not event:
            return None
        update_data = data.model_dump(exclude_unset=True, by_alias=False)
        update_data.pop("players", None)
        for field, value in update_data.items():
            setattr(event, field, value)
        self.db.commit()
        self.db.refresh(event)
        return event

    def delete_by_source_id(self, source_id: str) -> bool:
        event = self.get_by_source_id(source_id)
        if not event:
            return False
        self.db.delete(event)
        self.db.commit()
        logger.debug("Event deleted: source_id=%s", source_id)
        return True