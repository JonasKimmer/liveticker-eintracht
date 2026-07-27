"""
EventRepository
===============
Datenbankzugriff für Match-Events (Tore, Karten, Wechsel etc.).
Unterstützt Upsert-Logik für idempotente Partner-API-Synchronisierung.
"""

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

    @staticmethod
    def _serialize(
        data: EventCreate | EventUpdate, *, exclude_source_id: bool = False
    ) -> dict:
        """Dump event schema to dict, stripping non-column fields."""
        d = data.model_dump(exclude_unset=True, by_alias=False)
        if exclude_source_id:
            d.pop("source_id", None)
        return d

    def get_by_match(self, match_id: int) -> list[Event]:
        return (
            self.db.query(Event)
            .filter(Event.match_id == match_id)
            .order_by(Event.position, Event.time)
            .all()
        )

    def get_goals_up_to(
        self, match_id: int, *, position: Optional[int], event_id: int
    ) -> list[Event]:
        """Alle Tor-Events bis einschließlich der gegebenen Position oder Event-ID."""
        if position is not None:
            cutoff_col = Event.position
            cutoff = position
        else:
            cutoff_col = Event.id
            cutoff = event_id
        return (
            self.db.query(Event)
            .filter(
                Event.match_id == match_id,
                Event.event_type.in_(["goal", "own_goal"]),
                cutoff_col <= cutoff,
            )
            .all()
        )

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
        """Insert or update by source_id. Falls back to insert if no source_id.

        Handles the parallel-import race condition: if two requests both miss
        the initial SELECT and one fails with IntegrityError on INSERT, the
        loser retries with SELECT to return the winner's row.
        """
        if data.source_id:
            existing = self.get_by_source_id(data.source_id)
            if existing:
                for field, value in self._serialize(
                    data, exclude_source_id=True
                ).items():
                    setattr(existing, field, value)
                try:
                    self.db.commit()
                    self.db.refresh(existing)
                except IntegrityError:
                    self.db.rollback()
                    raise
                return existing, False

        event = Event(match_id=match_id, **self._serialize(data))
        self.db.add(event)
        try:
            self.db.commit()
            self.db.refresh(event)
            logger.debug("Event created: id=%s source_id=%s", event.id, event.source_id)
            return event, True
        except IntegrityError:
            self.db.rollback()
            # Race condition: another request inserted the same source_id first.
            # Fetch the winning row and return it instead.
            if data.source_id:
                existing = self.get_by_source_id(data.source_id)
                if existing:
                    logger.debug(
                        "Event race resolved: source_id=%s already exists as id=%s",
                        data.source_id,
                        existing.id,
                    )
                    return existing, False
            raise

    def update_by_source_id(self, source_id: str, data: EventUpdate) -> Optional[Event]:
        event = self.get_by_source_id(source_id)
        if not event:
            return None
        for field, value in self._serialize(data).items():
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
