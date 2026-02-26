# app/repositories/event_repository.py
"""
Event Repository - Data Access Layer.
Kapselt alle DB-Operationen für Events.
"""

from sqlalchemy.orm import Session
from app.models.event import Event
from app.schemas.event import EventCreate, EventUpdate


class EventRepository:
    """Repository für Event-Datenbank-Operationen."""

    def __init__(self, db: Session):
        self.db = db

    def get_all(self, skip: int = 0, limit: int = 100) -> list[Event]:
        """Holt alle Events mit Pagination."""
        return self.db.query(Event).offset(skip).limit(limit).all()

    def get_by_id(self, event_id: int) -> Event | None:
        """Holt Event nach ID."""
        return self.db.query(Event).filter(Event.id == event_id).first()

    def get_by_match(
        self, match_id: int, skip: int = 0, limit: int = 100
    ) -> list[Event]:
        """Holt alle Events für ein Match, sortiert nach Minute."""
        return (
            self.db.query(Event)
            .filter(Event.match_id == match_id)
            .order_by(Event.minute.asc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_by_type(
        self, event_type: str, skip: int = 0, limit: int = 100
    ) -> list[Event]:
        """Holt Events nach Typ (goal, card, etc.)."""
        return (
            self.db.query(Event)
            .filter(Event.type == event_type)
            .offset(skip)
            .limit(limit)
            .all()
        )

    def create(self, event: EventCreate) -> Event:
        """Erstellt neues Event."""
        db_event = Event(**event.model_dump())
        self.db.add(db_event)
        self.db.commit()
        self.db.refresh(db_event)
        return db_event

    def update(self, event_id: int, event_update: EventUpdate) -> Event | None:
        """Aktualisiert Event."""
        db_event = self.get_by_id(event_id)
        if not db_event:
            return None

        update_data = event_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_event, key, value)

        self.db.commit()
        self.db.refresh(db_event)
        return db_event

    def delete(self, event_id: int) -> bool:
        """Löscht Event."""
        db_event = self.get_by_id(event_id)
        if not db_event:
            return False

        self.db.delete(db_event)
        self.db.commit()
        return True
