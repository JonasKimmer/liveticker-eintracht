"""
StyleReferenceRepository
========================
Datenbankzugriff für Few-Shot Stilreferenzen.
Liefert zufällige Beispieltexte nach Event-Typ und Instanz (generic / ef_whitelabel).
"""

from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from app.models.style_reference import StyleReference


class StyleReferenceRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_samples(
        self,
        event_type: str,
        instance: str = "ef_whitelabel",
        limit: int = 3,
        league: str | None = None,
        min_text_length: int = 20,
    ) -> list[StyleReference]:
        """
        Holt zufällige Stilreferenzen für einen event_type.

        Falls league angegeben und genug Treffer vorhanden → league-spezifisch filtern.
        Fallback: ohne league-Filter (alle Ligen).
        """
        base_filters = [
            StyleReference.event_type == event_type,
            StyleReference.instance == instance,
            func.length(StyleReference.text) >= min_text_length,
        ]

        if league:
            results = self._random_sample(base_filters + [StyleReference.league == league], limit)
            if len(results) >= limit:
                return results
            # Fallback: ohne League-Filter

        return self._random_sample(base_filters, limit)

    def _random_sample(self, filters: list, limit: int) -> list[StyleReference]:
        return (
            self.db.query(StyleReference)
            .filter(*filters)
            .order_by(func.random())
            .limit(limit)
            .all()
        )

    def bulk_insert(self, records: list[dict]) -> int:
        """Für n8n-Import: Liste von Dicts einfügen."""
        objs = [StyleReference(**r) for r in records]
        self.db.bulk_save_objects(objs)
        self.db.commit()
        return len(objs)
