# app/api/v1/endpoints/lineups.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.repositories.lineup_repository import LineupRepository
from app.schemas.lineup import LineupCreate, LineupUpdate, LineupResponse

router = APIRouter(prefix="/lineups", tags=["lineups"])


@router.get("/", response_model=List[LineupResponse])
def get_all_lineups(db: Session = Depends(get_db)):
    repo = LineupRepository(db)
    return repo.get_all()


@router.get("/match/{match_id}", response_model=List[LineupResponse])
def get_lineups_by_match(match_id: int, db: Session = Depends(get_db)):
    """Alle Spieler (Starter + Ersatz) für ein Match."""
    repo = LineupRepository(db)
    return repo.get_by_match(match_id)


@router.get("/match/{match_id}/starters", response_model=List[LineupResponse])
def get_starters_by_match(match_id: int, db: Session = Depends(get_db)):
    """Nur Startelf."""
    repo = LineupRepository(db)
    return repo.get_starters_by_match(match_id)


@router.get("/match/{match_id}/substitutes", response_model=List[LineupResponse])
def get_substitutes_by_match(match_id: int, db: Session = Depends(get_db)):
    """Nur Ersatzbank."""
    repo = LineupRepository(db)
    return repo.get_substitutes_by_match(match_id)


@router.post("/", response_model=LineupResponse, status_code=201)
def create_lineup(lineup: LineupCreate, db: Session = Depends(get_db)):
    repo = LineupRepository(db)
    return repo.create(lineup)


@router.delete("/{lineup_id}", status_code=204)
def delete_lineup(lineup_id: int, db: Session = Depends(get_db)):
    repo = LineupRepository(db)
    if not repo.delete(lineup_id):
        raise HTTPException(status_code=404, detail="Lineup not found")
