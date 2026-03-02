from sqlalchemy.orm import Session
from app.models.event import Event
from app.schemas.event import EventCreate, EventUpdate


class EventRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_all(self, skip: int = 0, limit: int = 100) -> list[Event]:
        return self.db.query(Event).offset(skip).limit(limit).all()

    def get_by_id(self, event_id: int) -> Event | None:
        return self.db.query(Event).filter(Event.id == event_id).first()

    def get_by_match(
        self, match_id: int, skip: int = 0, limit: int = 100
    ) -> list[Event]:
        return (
            self.db.query(Event)
            .filter(Event.match_id == match_id)
            .order_by(Event.position.asc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def create(self, event: EventCreate) -> Event:
        db_event = Event(**event.model_dump())
        self.db.add(db_event)
        self.db.commit()
        self.db.refresh(db_event)
        return db_event

    def update(self, event_id: int, event_update: EventUpdate) -> Event | None:
        db_event = self.get_by_id(event_id)
        if not db_event:
            return None
        for k, v in event_update.model_dump(exclude_unset=True).items():
            setattr(db_event, k, v)
        self.db.commit()
        self.db.refresh(db_event)
        return db_event

    def delete(self, event_id: int) -> bool:
        db_event = self.get_by_id(event_id)
        if not db_event:
            return False
        self.db.delete(db_event)
        self.db.commit()
        return True
