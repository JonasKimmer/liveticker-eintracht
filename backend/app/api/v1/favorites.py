from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.database import get_db
from app.repositories.user_favorite_repository import UserFavoriteRepository
from app.schemas.match import MatchSimple
from app.models.match import Match as MatchModel

router = APIRouter(prefix="/favorites", tags=["favorites"])


@router.get("/")
def get_user_favorites(db: Session = Depends(get_db)):
    return UserFavoriteRepository(db).get_all()


@router.get("/matches", response_model=list[MatchSimple])
def get_favorite_team_matches(db: Session = Depends(get_db)):
    favorites = UserFavoriteRepository(db).get_all()
    team_ids = [f.team_id for f in favorites]
    if not team_ids:
        return []
    return (
        db.query(MatchModel)
        .filter(
            or_(
                MatchModel.home_team_id.in_(team_ids),
                MatchModel.away_team_id.in_(team_ids),
            )
        )
        .order_by(MatchModel.starts_at.desc())
        .limit(50)
        .all()
    )


@router.post("/", status_code=201)
def add_favorite(team_id: int, db: Session = Depends(get_db)):
    from app.models.user_favorite import UserFavorite

    existing = db.query(UserFavorite).filter(UserFavorite.team_id == team_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already a favorite")
    fav = UserFavorite(team_id=team_id)
    db.add(fav)
    db.commit()
    db.refresh(fav)
    return fav


@router.delete("/{team_id}", status_code=204)
def remove_favorite(team_id: int, db: Session = Depends(get_db)):
    from app.models.user_favorite import UserFavorite

    fav = db.query(UserFavorite).filter(UserFavorite.team_id == team_id).first()
    if not fav:
        raise HTTPException(status_code=404, detail="Favorite not found")
    db.delete(fav)
    db.commit()
