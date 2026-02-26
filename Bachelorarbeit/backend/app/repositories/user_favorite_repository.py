"""
UserFavorite Repository - Data Access Layer.
"""

from sqlalchemy.orm import Session, joinedload
from app.models.user_favorite import UserFavorite
from app.schemas.user_favorite import UserFavoriteCreate


class UserFavoriteRepository:
    """Repository für UserFavorite-Datenbank-Operationen."""

    def __init__(self, db: Session):
        self.db = db

    def get_by_user(self, user_id: int) -> list[UserFavorite]:
        """Holt alle Favoriten eines Users."""
        return (
            self.db.query(UserFavorite)
            .options(joinedload(UserFavorite.team))
            .filter(UserFavorite.user_id == user_id)
            .all()
        )

    def get_by_id(self, favorite_id: int) -> UserFavorite | None:
        """Holt Favorit nach ID."""
        return (
            self.db.query(UserFavorite)
            .options(joinedload(UserFavorite.team))
            .filter(UserFavorite.id == favorite_id)
            .first()
        )

    def exists(self, user_id: int, team_id: int) -> bool:
        """Prüft ob Favorit bereits existiert."""
        return (
            self.db.query(UserFavorite)
            .filter(UserFavorite.user_id == user_id, UserFavorite.team_id == team_id)
            .count()
            > 0
        )

    def create(self, favorite: UserFavoriteCreate) -> UserFavorite:
        """Erstellt neuen Favoriten."""
        db_favorite = UserFavorite(**favorite.model_dump())
        self.db.add(db_favorite)
        self.db.commit()
        self.db.refresh(db_favorite)
        return db_favorite

    def delete(self, user_id: int, team_id: int) -> bool:
        """Löscht Favoriten."""
        db_favorite = (
            self.db.query(UserFavorite)
            .filter(UserFavorite.user_id == user_id, UserFavorite.team_id == team_id)
            .first()
        )

        if not db_favorite:
            return False

        self.db.delete(db_favorite)
        self.db.commit()
        return True
