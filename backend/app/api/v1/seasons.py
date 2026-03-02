from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories.season_repository import SeasonRepository
from app.schemas.season import Season, SeasonCreate, SeasonUpdate

router = APIRouter(prefix="/seasons", tags=["seasons"])


@router.get("/", response_model=list[Season])
def get_seasons(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return SeasonRepository(db).get_all(skip=skip, limit=limit)


@router.get("/current", response_model=Season)
def get_current_season(db: Session = Depends(get_db)):
    season = SeasonRepository(db).get_current()
    if not season:
        raise HTTPException(status_code=404, detail="No current season found")
    return season


@router.get("/{season_id}", response_model=Season)
def get_season(season_id: int, db: Session = Depends(get_db)):
    season = SeasonRepository(db).get_by_id(season_id)
    if not season:
        raise HTTPException(status_code=404, detail="Season not found")
    return season


@router.post("/", response_model=Season, status_code=201)
def create_season(season: SeasonCreate, db: Session = Depends(get_db)):
    return SeasonRepository(db).create(season)


@router.patch("/{season_id}", response_model=Season)
def update_season(
    season_id: int, season_update: SeasonUpdate, db: Session = Depends(get_db)
):
    updated = SeasonRepository(db).update(season_id, season_update)
    if not updated:
        raise HTTPException(status_code=404, detail="Season not found")
    return updated


@router.delete("/{season_id}", status_code=204)
def delete_season(season_id: int, db: Session = Depends(get_db)):
    if not SeasonRepository(db).delete(season_id):
        raise HTTPException(status_code=404, detail="Season not found")
