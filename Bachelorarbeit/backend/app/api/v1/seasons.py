"""
Seasons API Endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories.season_repository import SeasonRepository
from app.schemas.season import Season, SeasonCreate, SeasonUpdate


router = APIRouter(prefix="/seasons", tags=["seasons"])


@router.get("/", response_model=list[Season])
def get_seasons(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Holt alle Seasons."""
    repo = SeasonRepository(db)
    return repo.get_all(skip=skip, limit=limit)


@router.get("/current", response_model=Season)
def get_current_season(db: Session = Depends(get_db)):
    """Holt die aktuelle Season."""
    repo = SeasonRepository(db)
    season = repo.get_current()

    if not season:
        raise HTTPException(status_code=404, detail="No current season found")

    return season


@router.get("/{season_id}", response_model=Season)
def get_season(season_id: int, db: Session = Depends(get_db)):
    """Holt Season nach ID."""
    repo = SeasonRepository(db)
    season = repo.get_by_id(season_id)

    if not season:
        raise HTTPException(status_code=404, detail="Season not found")

    return season


@router.post("/", response_model=Season, status_code=201)
def create_season(season: SeasonCreate, db: Session = Depends(get_db)):
    """Erstellt neue Season."""
    repo = SeasonRepository(db)

    # Prüfen ob Jahr bereits existiert
    existing = repo.get_by_year(season.year)
    if existing:
        raise HTTPException(
            status_code=400, detail=f"Season {season.year} already exists"
        )

    return repo.create(season)


@router.patch("/{season_id}", response_model=Season)
def update_season(
    season_id: int, season_update: SeasonUpdate, db: Session = Depends(get_db)
):
    """Aktualisiert Season."""
    repo = SeasonRepository(db)
    updated_season = repo.update(season_id, season_update)

    if not updated_season:
        raise HTTPException(status_code=404, detail="Season not found")

    return updated_season


@router.post("/{season_id}/set-current", response_model=Season)
def set_current_season(season_id: int, db: Session = Depends(get_db)):
    """Setzt Season als aktuelle Season."""
    repo = SeasonRepository(db)
    season = repo.set_current(season_id)

    if not season:
        raise HTTPException(status_code=404, detail="Season not found")

    return season
