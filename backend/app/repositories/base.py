"""
BaseRepository
==============
Generische Basis für alle Repository-Klassen.
Erzwingt den `exists()`-Vertrag und eliminiert copy-paste.
"""

from typing import Generic, Optional, TypeVar

from sqlalchemy.orm import Session

ModelT = TypeVar("ModelT")


class BaseRepository(Generic[ModelT]):
    """Abstrakte Basisklasse für alle Repositories.

    Subklassen müssen `model` als Klassen-Attribut setzen:

        class TeamRepository(BaseRepository[Team]):
            model = Team
    """

    model: type  # SQLAlchemy-Modell-Klasse

    def __init__(self, db: Session) -> None:
        self.db = db

    def exists(self, record_id: int) -> bool:
        """Prüft ob ein Datensatz mit der gegebenen ID existiert."""
        return (
            self.db.query(self.model.id).filter(self.model.id == record_id).scalar()
            is not None
        )
