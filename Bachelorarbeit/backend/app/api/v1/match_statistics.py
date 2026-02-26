from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.repositories.match_statistic_repository import MatchStatisticRepository
from app.schemas.match_statistic import (
    MatchStatisticCreate,
    MatchStatisticUpdate,
    MatchStatisticResponse,
)

router = APIRouter(prefix="/match-statistics", tags=["match-statistics"])


@router.get("/", response_model=List[MatchStatisticResponse])
def get_all_match_statistics(db: Session = Depends(get_db)):
    repo = MatchStatisticRepository(db)
    return repo.get_all()


@router.get("/{match_stat_id}", response_model=MatchStatisticResponse)
def get_match_statistic(match_stat_id: int, db: Session = Depends(get_db)):
    repo = MatchStatisticRepository(db)
    match_stat = repo.get_by_id(match_stat_id)
    if not match_stat:
        raise HTTPException(status_code=404, detail="Match statistic not found")
    return match_stat


@router.get("/match/{match_id}", response_model=List[MatchStatisticResponse])
def get_match_statistics_by_match(match_id: int, db: Session = Depends(get_db)):
    repo = MatchStatisticRepository(db)
    return repo.get_by_match(match_id)


@router.get("/team/{team_id}", response_model=List[MatchStatisticResponse])
def get_match_statistics_by_team(team_id: int, db: Session = Depends(get_db)):
    repo = MatchStatisticRepository(db)
    return repo.get_by_team(team_id)


@router.post("/", response_model=MatchStatisticResponse, status_code=201)
def create_match_statistic(
    match_stat: MatchStatisticCreate, db: Session = Depends(get_db)
):
    repo = MatchStatisticRepository(db)
    return repo.create(match_stat)


@router.patch("/{match_stat_id}", response_model=MatchStatisticResponse)
def update_match_statistic(
    match_stat_id: int, match_stat: MatchStatisticUpdate, db: Session = Depends(get_db)
):
    repo = MatchStatisticRepository(db)
    updated_stat = repo.update(match_stat_id, match_stat)
    if not updated_stat:
        raise HTTPException(status_code=404, detail="Match statistic not found")
    return updated_stat


@router.delete("/{match_stat_id}", status_code=204)
def delete_match_statistic(match_stat_id: int, db: Session = Depends(get_db)):
    repo = MatchStatisticRepository(db)
    if not repo.delete(match_stat_id):
        raise HTTPException(status_code=404, detail="Match statistic not found")
