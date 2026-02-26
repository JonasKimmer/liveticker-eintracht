"""
LeagueSeasons API Endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories.league_season_repository import LeagueSeasonRepository
from app.repositories.match_repository import MatchRepository
from app.schemas.league_season import (
    LeagueSeason,
    LeagueSeasonCreate,
    LeagueSeasonUpdate,
)
from app.schemas.match import Match


router = APIRouter(prefix="/league-seasons", tags=["league-seasons"])


@router.get("/", response_model=list[LeagueSeason])
def get_league_seasons(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Holt alle LeagueSeasons."""
    repo = LeagueSeasonRepository(db)
    return repo.get_all(skip=skip, limit=limit)


@router.get("/{league_season_id}", response_model=LeagueSeason)
def get_league_season(league_season_id: int, db: Session = Depends(get_db)):
    """Holt LeagueSeason nach ID."""
    repo = LeagueSeasonRepository(db)
    league_season = repo.get_by_id(league_season_id)

    if not league_season:
        raise HTTPException(status_code=404, detail="LeagueSeason not found")

    return league_season


@router.get("/{league_season_id}/matches", response_model=list[Match])
def get_league_season_matches(
    league_season_id: int,
    round: str | None = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """Holt alle Matches einer LeagueSeason, optional gefiltert nach Spieltag."""
    match_repo = MatchRepository(db)

    if round:
        return match_repo.get_by_round(league_season_id, round)

    return match_repo.get_by_league_season(league_season_id, skip=skip, limit=limit)


@router.get("/{league_season_id}/rounds", response_model=list[str])
def get_league_season_rounds(league_season_id: int, db: Session = Depends(get_db)):
    """Holt alle Spieltage einer LeagueSeason."""
    repo = LeagueSeasonRepository(db)
    league_season = repo.get_by_id(league_season_id)

    if not league_season:
        raise HTTPException(status_code=404, detail="LeagueSeason not found")

    if not league_season.rounds:
        return []

    import json

    rounds = league_season.rounds
    if isinstance(rounds, str):
        rounds = json.loads(rounds)

    return rounds


@router.post("/", response_model=LeagueSeason, status_code=201)
def create_league_season(
    league_season: LeagueSeasonCreate, db: Session = Depends(get_db)
):
    """Erstellt neue LeagueSeason."""
    repo = LeagueSeasonRepository(db)

    # Prüfen ob Kombination bereits existiert
    existing = repo.get_by_league_and_season(
        league_season.league_id, league_season.season_id
    )
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"LeagueSeason for league {league_season.league_id} and season {league_season.season_id} already exists",
        )

    return repo.create(league_season)


@router.patch("/{league_season_id}", response_model=LeagueSeason)
def update_league_season(
    league_season_id: int,
    league_season_update: LeagueSeasonUpdate,
    db: Session = Depends(get_db),
):
    """Aktualisiert LeagueSeason."""
    repo = LeagueSeasonRepository(db)
    updated_league_season = repo.update(league_season_id, league_season_update)

    if not updated_league_season:
        raise HTTPException(status_code=404, detail="LeagueSeason not found")

    return updated_league_season
