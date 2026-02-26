from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.repositories.player_statistic_repository import PlayerStatisticRepository
from app.schemas.player_statistic import (
    PlayerStatisticCreate,
    PlayerStatisticUpdate,
    PlayerStatisticResponse,
)

router = APIRouter(prefix="/player-statistics", tags=["player-statistics"])


@router.get("/", response_model=List[PlayerStatisticResponse])
def get_all_player_statistics(db: Session = Depends(get_db)):
    repo = PlayerStatisticRepository(db)
    return repo.get_all()


@router.get("/{player_stat_id}", response_model=PlayerStatisticResponse)
def get_player_statistic(player_stat_id: int, db: Session = Depends(get_db)):
    repo = PlayerStatisticRepository(db)
    player_stat = repo.get_by_id(player_stat_id)
    if not player_stat:
        raise HTTPException(status_code=404, detail="Player statistic not found")
    return player_stat


@router.get("/match/{match_id}", response_model=List[PlayerStatisticResponse])
def get_player_statistics_by_match(match_id: int, db: Session = Depends(get_db)):
    repo = PlayerStatisticRepository(db)
    return repo.get_by_match(match_id)


@router.get("/player/{player_id}", response_model=List[PlayerStatisticResponse])
def get_player_statistics_by_player(player_id: int, db: Session = Depends(get_db)):
    repo = PlayerStatisticRepository(db)
    return repo.get_by_player(player_id)


@router.get("/team/{team_id}", response_model=List[PlayerStatisticResponse])
def get_player_statistics_by_team(team_id: int, db: Session = Depends(get_db)):
    repo = PlayerStatisticRepository(db)
    return repo.get_by_team(team_id)


@router.post("/", response_model=PlayerStatisticResponse, status_code=201)
def create_player_statistic(
    player_stat: PlayerStatisticCreate, db: Session = Depends(get_db)
):
    repo = PlayerStatisticRepository(db)
    return repo.create(player_stat)


@router.patch("/{player_stat_id}", response_model=PlayerStatisticResponse)
def update_player_statistic(
    player_stat_id: int,
    player_stat: PlayerStatisticUpdate,
    db: Session = Depends(get_db),
):
    repo = PlayerStatisticRepository(db)
    updated_stat = repo.update(player_stat_id, player_stat)
    if not updated_stat:
        raise HTTPException(status_code=404, detail="Player statistic not found")
    return updated_stat


@router.delete("/{player_stat_id}", status_code=204)
def delete_player_statistic(player_stat_id: int, db: Session = Depends(get_db)):
    repo = PlayerStatisticRepository(db)
    if not repo.delete(player_stat_id):
        raise HTTPException(status_code=404, detail="Player statistic not found")
