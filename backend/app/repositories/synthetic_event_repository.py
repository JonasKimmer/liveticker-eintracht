"""
SyntheticEventRepository
========================
Datenbankzugriff für SyntheticEvent (Spielphasen, Verletzungsdaten etc.).
"""

import logging
from typing import Optional

from sqlalchemy.orm import Session

from app.models.synthetic_event import SyntheticEvent

logger = logging.getLogger(__name__)


class SyntheticEventRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_id(self, synthetic_id: int) -> Optional[SyntheticEvent]:
        return (
            self.db.query(SyntheticEvent)
            .filter(SyntheticEvent.id == synthetic_id)
            .first()
        )

    def get_by_match(self, match_id: int) -> list[SyntheticEvent]:
        return (
            self.db.query(SyntheticEvent)
            .filter(SyntheticEvent.match_id == match_id)
            .all()
        )

    def get_by_match_type(
        self, match_id: int, event_type: str
    ) -> Optional[SyntheticEvent]:
        return (
            self.db.query(SyntheticEvent)
            .filter(
                SyntheticEvent.match_id == match_id,
                SyntheticEvent.type == event_type,
            )
            .first()
        )

    def get_injuries(self, match_id: int) -> list[SyntheticEvent]:
        """Alle Pre-Match-Verletzungseinträge für ein Spiel."""
        return (
            self.db.query(SyntheticEvent)
            .filter(
                SyntheticEvent.match_id == match_id,
                SyntheticEvent.type.like("pre_match_injuries%"),
            )
            .all()
        )

    def get_or_create_flush(
        self, match_id: int, event_type: str, data: dict
    ) -> SyntheticEvent:
        """Gibt ein bestehendes SyntheticEvent zurück oder erstellt+flushed ein neues."""
        existing = self.get_by_match_type(match_id, event_type)
        if existing:
            return existing
        synthetic = SyntheticEvent(match_id=match_id, type=event_type, data=data)
        self.db.add(synthetic)
        self.db.flush()
        logger.debug(
            "SyntheticEvent created: id=%s match_id=%s type=%s",
            synthetic.id, match_id, event_type,
        )
        return synthetic
