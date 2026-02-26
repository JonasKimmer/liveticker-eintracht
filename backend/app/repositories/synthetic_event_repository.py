# app/repositories/synthetic_event_repository.py

from sqlalchemy.orm import Session
from app.models.synthetic_event import SyntheticEvent
from app.schemas.synthetic_event import SyntheticEventCreate, SyntheticEventUpdate


class SyntheticEventRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, event_id: int) -> SyntheticEvent | None:
        return (
            self.db.query(SyntheticEvent).filter(SyntheticEvent.id == event_id).first()
        )

    def get_by_match(self, match_id: int) -> list[SyntheticEvent]:
        return (
            self.db.query(SyntheticEvent)
            .filter(SyntheticEvent.match_id == match_id)
            .order_by(SyntheticEvent.created_at)
            .all()
        )

    def create(self, data: SyntheticEventCreate) -> SyntheticEvent:
        obj = SyntheticEvent(**data.model_dump())
        self.db.add(obj)
        self.db.commit()
        self.db.refresh(obj)
        return obj

    def update(
        self, event_id: int, data: SyntheticEventUpdate
    ) -> SyntheticEvent | None:
        obj = self.get_by_id(event_id)
        if not obj:
            return None
        for k, v in data.model_dump(exclude_unset=True).items():
            setattr(obj, k, v)
        self.db.commit()
        self.db.refresh(obj)
        return obj
