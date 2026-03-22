"""
Players Router
==============
Endpunkte für Spielerdaten und Statistiken.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories.player_repository import PlayerRepository
from app.schemas.player import (
    PaginatedPlayerResponse,
    PlayerCreate,
    PlayerResponse,
    PlayerStatisticsUpdate,
    PlayerUpdate,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/players", tags=["Players"])


def _get_player_or_404(player_id: int, repo: PlayerRepository):
    player = repo.get_by_id(player_id)
    if not player:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Player {player_id} not found.",
        )
    return player


# ------------------------------------------------------------------ #
# GET /players                                                         #
# ------------------------------------------------------------------ #


@router.get(
    "",
    response_model=PaginatedPlayerResponse,
    response_model_by_alias=True,
    summary="List players (paginated, optional teamId filter)",
)
def list_players(
    team_id: Optional[int] = Query(None, alias="teamId"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500, alias="pageSize"),
    db: Session = Depends(get_db),
) -> PaginatedPlayerResponse:
    items, total = PlayerRepository(db).get_paginated(page, page_size, team_id)
    return PaginatedPlayerResponse.create(
        items=[PlayerResponse.model_validate(p) for p in items],
        total=total,
        page=page,
        page_size=page_size,
    )


# ------------------------------------------------------------------ #
# POST /players                                                        #
# ------------------------------------------------------------------ #


@router.post(
    "",
    response_model=PlayerResponse,
    response_model_by_alias=True,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new player",
)
def create_player(
    data: PlayerCreate,
    db: Session = Depends(get_db),
) -> PlayerResponse:
    player = PlayerRepository(db).create(data)
    return PlayerResponse.model_validate(player)


# ------------------------------------------------------------------ #
# GET /players/{playerId}                                              #
# ------------------------------------------------------------------ #


@router.get(
    "/{playerId}",
    response_model=PlayerResponse,
    response_model_by_alias=True,
    summary="Get a single player",
)
def get_player(playerId: int, db: Session = Depends(get_db)) -> PlayerResponse:
    return PlayerResponse.model_validate(_get_player_or_404(playerId, PlayerRepository(db)))


# ------------------------------------------------------------------ #
# PUT /players/{playerId}                                              #
# ------------------------------------------------------------------ #


@router.put(
    "/{playerId}",
    response_model=PlayerResponse,
    response_model_by_alias=True,
    summary="Update an existing player",
)
def update_player(
    playerId: int,
    data: PlayerUpdate,
    db: Session = Depends(get_db),
) -> PlayerResponse:
    repo = PlayerRepository(db)
    player = _get_player_or_404(playerId, repo)
    player = repo.update(player, data)
    return PlayerResponse.model_validate(player)


# ------------------------------------------------------------------ #
# DELETE /players/{playerId}                                           #
# ------------------------------------------------------------------ #


@router.delete(
    "/{playerId}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a player",
)
def delete_player(playerId: int, db: Session = Depends(get_db)) -> None:
    repo = PlayerRepository(db)
    player = _get_player_or_404(playerId, repo)
    repo.delete(player)


# ------------------------------------------------------------------ #
# PATCH /players/{playerId}/statistics                                 #
# ------------------------------------------------------------------ #


@router.patch(
    "/{playerId}/statistics",
    response_model=PlayerResponse,
    response_model_by_alias=True,
    summary="Update player statistics",
)
def update_player_statistics(
    playerId: int,
    data: PlayerStatisticsUpdate,
    db: Session = Depends(get_db),
) -> PlayerResponse:
    repo = PlayerRepository(db)
    player = _get_player_or_404(playerId, repo)
    player = repo.update_statistics(player, data)
    return PlayerResponse.model_validate(player)
