from sqlalchemy.orm import Session
from app.models.ticker_entry import TickerEntry
from app.schemas.ticker_entry import TickerEntryCreate, TickerEntryUpdate
from datetime import datetime, timezone


class TickerEntryRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_all(self, skip: int = 0, limit: int = 100) -> list[TickerEntry]:
        return self.db.query(TickerEntry).offset(skip).limit(limit).all()

    def get_by_id(self, entry_id: int) -> TickerEntry | None:
        return self.db.query(TickerEntry).filter(TickerEntry.id == entry_id).first()

    def get_by_match(
        self, match_id: int, skip: int = 0, limit: int = 100
    ) -> list[TickerEntry]:
        return (
            self.db.query(TickerEntry)
            .filter(TickerEntry.match_id == match_id)
            .order_by(TickerEntry.minute.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_by_mode(
        self, mode: str, skip: int = 0, limit: int = 100
    ) -> list[TickerEntry]:
        return (
            self.db.query(TickerEntry)
            .filter(TickerEntry.mode == mode)
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_published(self, match_id: int) -> list[TickerEntry]:
        return (
            self.db.query(TickerEntry)
            .filter(
                TickerEntry.match_id == match_id,
                TickerEntry.status == "published",
            )
            .order_by(TickerEntry.minute.desc())
            .all()
        )

    def create(self, entry: TickerEntryCreate) -> TickerEntry:
        data = entry.model_dump()

        # Manuelle Einträge sofort publishen
        if data.get("mode") == "manual" and data.get("status") == "draft":
            data["status"] = "published"
            data["published_at"] = datetime.now(timezone.utc)

        db_entry = TickerEntry(**data)
        self.db.add(db_entry)
        self.db.commit()
        self.db.refresh(db_entry)
        return db_entry

    def update(
        self, entry_id: int, entry_update: TickerEntryUpdate
    ) -> TickerEntry | None:
        db_entry = self.get_by_id(entry_id)
        if not db_entry:
            return None
        for k, v in entry_update.model_dump(exclude_unset=True).items():
            setattr(db_entry, k, v)
        self.db.commit()
        self.db.refresh(db_entry)
        return db_entry

    def publish(self, entry_id: int) -> TickerEntry | None:
        db_entry = self.get_by_id(entry_id)
        if not db_entry:
            return None
        db_entry.status = "published"
        db_entry.published_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(db_entry)
        return db_entry

    def delete(self, entry_id: int) -> bool:
        db_entry = self.get_by_id(entry_id)
        if not db_entry:
            return False
        self.db.delete(db_entry)
        self.db.commit()
        return True
