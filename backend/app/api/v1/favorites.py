import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.match import Match as MatchModel
from app.repositories.user_favorite_repository import UserFavoriteRepository
from app.schemas.match import MatchResponse
from app.schemas.user_favorite import UserFavoriteCreate, UserFavoriteResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/favorites", tags=["Favorites"])


@router.get(
    "",
    response_model=list[UserFavoriteResponse],
    response_model_by_alias=True,
    summary="List all favorites",
)
def get_favorites(db: Session = Depends(get_db)) -> list[UserFavoriteResponse]:
    return UserFavoriteRepository(db).get_all()


@router.get(
    "/matches",
    response_model=list[MatchResponse],
    response_model_by_alias=True,
    summary="List matches for favorite teams",
)
def get_favorite_matches(db: Session = Depends(get_db)) -> list[MatchResponse]:
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


@router.post(
    "",
    response_model=UserFavoriteResponse,
    response_model_by_alias=True,
    status_code=status.HTTP_201_CREATED,
    summary="Add a favorite team",
)
def add_favorite(
    data: UserFavoriteCreate,
    db: Session = Depends(get_db),
) -> UserFavoriteResponse:
    repo = UserFavoriteRepository(db)
    if repo.exists(data.team_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Team is already a favorite.",
        )
    return repo.create(data.team_id)


@router.delete(
    "/{teamId}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove a favorite team",
)
def remove_favorite(
    teamId: int,
    db: Session = Depends(get_db),
) -> None:
    if not UserFavoriteRepository(db).delete(teamId):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Favorite not found"
        )