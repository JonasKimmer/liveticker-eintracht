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
    # Fallback: wenn für einen event_type keine Referenzen existieren,
    # auf einen verwandten Typ zurückfallen.
    _FALLBACK_MAP: dict[str, str] = {
        "kick_off": "comment",
        "halftime": "halftime_comment",
        "fulltime": "post_match",
        "extra_time_start": "comment",
        "extra_halftime": "halftime_comment",
        "penalty_shootout": "comment",
    }

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
            results = self._random_sample(
                base_filters + [func.lower(StyleReference.league) == league.lower()],
                limit,
            )
            if len(results) >= limit:
                return results
            # Fallback: ohne League-Filter

        results = self._random_sample(base_filters, limit)
        if results:
            return results

        # Fallback auf verwandten event_type
        fallback = self._FALLBACK_MAP.get(event_type)
        if fallback:
            fallback_filters = [
                StyleReference.event_type == fallback,
                StyleReference.instance == instance,
                func.length(StyleReference.text) >= min_text_length,
            ]
            return self._random_sample(fallback_filters, limit)

        return []

    def _random_sample(self, filters: list, limit: int) -> list[StyleReference]:
        return (
            self.db.query(StyleReference)
            .filter(*filters)
            .order_by(func.random())
            .limit(limit)
            .all()
        )
