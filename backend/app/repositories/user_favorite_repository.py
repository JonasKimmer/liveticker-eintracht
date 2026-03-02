from sqlalchemy.orm import Session, joinedload
from app.models.user_favorite import UserFavorite
from app.schemas.user_favorite import UserFavoriteCreate


class UserFavoriteRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_all(self) -> list[UserFavorite]:
        return self.db.query(UserFavorite).options(joinedload(UserFavorite.team)).all()

    def get_by_id(self, favorite_id: int) -> UserFavorite | None:
        return (
            self.db.query(UserFavorite)
            .options(joinedload(UserFavorite.team))
            .filter(UserFavorite.id == favorite_id)
            .first()
        )

    def exists(self, team_id: int) -> bool:
        return (
            self.db.query(UserFavorite).filter(UserFavorite.team_id == team_id).count()
            > 0
        )

    def create(self, team_id: int) -> UserFavorite:
        fav = UserFavorite(team_id=team_id)
        self.db.add(fav)
        self.db.commit()
        self.db.refresh(fav)
        return fav

    def delete(self, team_id: int) -> bool:
        fav = (
            self.db.query(UserFavorite).filter(UserFavorite.team_id == team_id).first()
        )
        if not fav:
            return False
        self.db.delete(fav)
        self.db.commit()
        return True
