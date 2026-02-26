"""
UserFavorites API Endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories.user_favorite_repository import UserFavoriteRepository
from app.repositories.match_repository import MatchRepository
from app.schemas.user_favorite import UserFavorite, UserFavoriteCreate
from app.schemas.match import Match


router = APIRouter(prefix="/favorites", tags=["favorites"])


@router.get("/", response_model=list[UserFavorite])
def get_user_favorites(user_id: int = 1, db: Session = Depends(get_db)):
    """
    Holt alle Favoriten-Teams eines Users.

    TODO: user_id sollte später aus JWT-Token kommen!
    """
    repo = UserFavoriteRepository(db)
    return repo.get_by_user(user_id)


@router.get("/matches", response_model=list[Match])
def get_favorite_team_matches(user_id: int = 1, db: Session = Depends(get_db)):
    """
    Holt alle Matches der Favoriten-Teams eines Users.

    TODO: user_id sollte später aus JWT-Token kommen!
    """
    fav_repo = UserFavoriteRepository(db)
    match_repo = MatchRepository(db)

    # Alle Favoriten-Teams holen
    favorites = fav_repo.get_by_user(user_id)
    team_ids = [fav.team_id for fav in favorites]

    if not team_ids:
        return []

    # Matches aller Favoriten-Teams holen
    from app.models.match import Match as MatchModel

    matches = (
        db.query(MatchModel)
        .filter(
            (MatchModel.home_team_id.in_(team_ids))
            | (MatchModel.away_team_id.in_(team_ids))
        )
        .order_by(MatchModel.match_date.desc())
        .limit(50)
        .all()
    )

    return matches


@router.post("/", response_model=UserFavorite, status_code=201)
def add_favorite(favorite: UserFavoriteCreate, db: Session = Depends(get_db)):
    """Fügt Team zu Favoriten hinzu."""
    repo = UserFavoriteRepository(db)

    # Prüfen ob bereits Favorit
    if repo.exists(favorite.user_id, favorite.team_id):
        raise HTTPException(status_code=400, detail="Team is already a favorite")

    return repo.create(favorite)


@router.delete("/{team_id}", status_code=204)
def remove_favorite(team_id: int, user_id: int = 1, db: Session = Depends(get_db)):
    """
    Entfernt Team von Favoriten.

    TODO: user_id sollte später aus JWT-Token kommen!
    """
    repo = UserFavoriteRepository(db)
    success = repo.delete(user_id, team_id)

    if not success:
        raise HTTPException(status_code=404, detail="Favorite not found")
