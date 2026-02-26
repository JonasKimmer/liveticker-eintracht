"""
Leagues API Endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories.league_repository import LeagueRepository
from app.repositories.league_season_repository import LeagueSeasonRepository
from app.schemas.league import League, LeagueCreate, LeagueUpdate
from app.schemas.league_season import LeagueSeason


router = APIRouter(prefix="/leagues", tags=["leagues"])


@router.get("/", response_model=list[League])
def get_leagues(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Holt alle Ligen."""
    repo = LeagueRepository(db)
    return repo.get_all(skip=skip, limit=limit)


@router.get("/{league_id}", response_model=League)
def get_league(league_id: int, db: Session = Depends(get_db)):
    """Holt Liga nach ID."""
    repo = LeagueRepository(db)
    league = repo.get_by_id(league_id)

    if not league:
        raise HTTPException(status_code=404, detail="League not found")

    return league


@router.get("/{league_id}/seasons", response_model=list[LeagueSeason])
def get_league_seasons(league_id: int, db: Session = Depends(get_db)):
    """Holt alle Seasons einer Liga."""
    repo = LeagueSeasonRepository(db)
    return repo.get_by_league(league_id)


@router.post("/", response_model=League, status_code=201)
def create_league(league: LeagueCreate, db: Session = Depends(get_db)):
    """Erstellt neue Liga."""
    repo = LeagueRepository(db)
    return repo.create(league)


@router.patch("/{league_id}", response_model=League)
def update_league(
    league_id: int, league_update: LeagueUpdate, db: Session = Depends(get_db)
):
    """Aktualisiert Liga."""
    repo = LeagueRepository(db)
    updated_league = repo.update(league_id, league_update)

    if not updated_league:
        raise HTTPException(status_code=404, detail="League not found")

    return updated_league


@router.delete("/{league_id}", status_code=204)
def delete_league(league_id: int, db: Session = Depends(get_db)):
    """Löscht Liga."""
    repo = LeagueRepository(db)
    success = repo.delete(league_id)

    if not success:
        raise HTTPException(status_code=404, detail="League not found")
