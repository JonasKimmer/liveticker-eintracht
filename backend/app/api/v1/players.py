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
from app.models.player import Player
from app.schemas.player import (
    PaginatedPlayerResponse,
    PlayerCreate,
    PlayerResponse,
    PlayerStatisticsUpdate,
    PlayerUpdate,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/players", tags=["Players"])


def _get_player_or_404(player_id: int, db: Session) -> Player:
    player = db.query(Player).filter(Player.id == player_id).first()
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
    q = db.query(Player).filter(Player.hidden.is_(False))
    if team_id is not None:
        q = q.filter(Player.team_id == team_id)
    total = q.count()
    items = (
        q.order_by(Player.last_name, Player.first_name)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
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
    player = Player(
        sport=data.sport,
        team_id=data.team_id,
        first_name=data.first_name,
        last_name=data.last_name,
        short_name=data.short_name,
        display_name=data.display_name,
        known_name=data.known_name,
        position=data.position,
        birthday=data.birthday,
        birthplace=data.birthplace,
        weight=data.weight,
        height=data.height,
        jersey_number=data.jersey_number,
        country=data.country,
        joined_on=data.joined_on,
        signing_date=data.signing_date,
        image_url=data.image_url,
        person_hero_image_url=data.person_hero_image_url,
        profile=data.profile,
        hidden=data.hidden,
        statistics=data.statistics.model_dump(by_alias=False) if data.statistics else None,
    )
    if data.id is not None:
        player.id = data.id
    db.add(player)
    db.commit()
    db.refresh(player)
    logger.info("Created player id=%d", player.id)
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
    return PlayerResponse.model_validate(_get_player_or_404(playerId, db))


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
    player = _get_player_or_404(playerId, db)

    for field, value in data.model_dump(exclude_unset=True, by_alias=False).items():
        if field == "statistics" and value is not None:
            setattr(player, field, value if isinstance(value, dict) else value)
        elif field != "id":
            setattr(player, field, value)

    db.commit()
    db.refresh(player)
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
    player = _get_player_or_404(playerId, db)
    db.delete(player)
    db.commit()
    logger.info("Deleted player id=%d", playerId)


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
    player = _get_player_or_404(playerId, db)

    new_stats = data.statistics.model_dump(exclude_none=True, by_alias=False)
    existing = player.statistics or {}
    existing.update(new_stats)
    player.statistics = existing

    db.commit()
    db.refresh(player)
    return PlayerResponse.model_validate(player)
