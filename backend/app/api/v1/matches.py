"""
Matches Router
==============
Endpunkte für Spielabruf, Spieltag-Navigation, Lineup und Statistiken.
"""

import logging
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.constants import FOOTBALL_API_PHASE_MAP
from app.core.database import get_db
from app.models.player_statistic import PlayerStatistic
from app.models.synthetic_event import SyntheticEvent
from app.repositories.match_repository import MatchRepository
from app.schemas.match import (
    LineupBulkUpdate,
    LineupPlayerResponse,
    MatchCreate,
    MatchResponse,
    MatchStatisticResponse,
    MatchUpdate,
    PaginatedMatchResponse,
    StatisticsBulkUpdate,
)
from app.schemas.player import PlayerStatisticResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/matches", tags=["Matches"])


# ------------------------------------------------------------------ #
# Match CRUD                                                           #
# ------------------------------------------------------------------ #


@router.get(
    "",
    response_model=PaginatedMatchResponse,
    response_model_by_alias=True,
    summary="List matches (paginated)",
)
def get_matches(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=500, alias="pageSize"),
    team_id: Optional[int] = Query(None, gt=0, alias="teamId"),
    competition_id: Optional[int] = Query(None, gt=0, alias="competitionId"),
    matchday: Optional[int] = Query(None, ge=1),
    match_state: Optional[str] = Query(None, alias="matchState"),
    db: Session = Depends(get_db),
) -> PaginatedMatchResponse:
    items, total = MatchRepository(db).get_paginated(
        page=page,
        page_size=page_size,
        team_id=team_id,
        competition_id=competition_id,
        matchday=matchday,
        match_state=match_state,
    )
    return PaginatedMatchResponse.create(
        items=[MatchResponse.model_validate(m) for m in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/{matchId}",
    response_model=MatchResponse,
    response_model_by_alias=True,
    summary="Get a single match",
)
def get_match(
    matchId: int,
    db: Session = Depends(get_db),
) -> MatchResponse:
    match = MatchRepository(db).get_by_id(matchId)
    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Match not found"
        )
    return match


@router.post(
    "",
    response_model=MatchResponse,
    response_model_by_alias=True,
    status_code=status.HTTP_201_CREATED,
    summary="Create a match",
)
def create_match(
    data: MatchCreate,
    db: Session = Depends(get_db),
) -> MatchResponse:
    try:
        return MatchRepository(db).create(data)
    except IntegrityError:
        logger.exception("IntegrityError creating match")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A match with this id already exists.",
        )


@router.patch(
    "/{matchId}",
    response_model=MatchResponse,
    response_model_by_alias=True,
    summary="Partially update a match",
)
def update_match(
    matchId: int,
    data: MatchUpdate,
    db: Session = Depends(get_db),
) -> MatchResponse:
    if not data.model_fields_set:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Request body must contain at least one field to update.",
        )
    try:
        updated = MatchRepository(db).update(matchId, data)
    except IntegrityError:
        logger.exception("IntegrityError updating match id=%s", matchId)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Update would violate a unique constraint.",
        )
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Match not found"
        )
    return updated


@router.delete(
    "/{matchId}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a match",
)
def delete_match(matchId: int, db: Session = Depends(get_db)) -> None:
    if not MatchRepository(db).delete(matchId):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Match not found"
        )


# ------------------------------------------------------------------ #
# Football API live sync                                               #
# ------------------------------------------------------------------ #



@router.post(
    "/{matchId}/sync-live",
    response_model=MatchResponse,
    response_model_by_alias=True,
    summary="Sync live minute and phase from Football API",
)
def sync_live(matchId: int, db: Session = Depends(get_db)) -> MatchResponse:
    repo = MatchRepository(db)
    match = repo.get_by_id(matchId)
    if not match:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match not found")

    if not match.external_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Match has no external_id – cannot sync with Football API",
        )
    if not settings.API_FOOTBALL_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="API_FOOTBALL_KEY not configured",
        )

    try:
        resp = httpx.get(
            f"{settings.API_FOOTBALL_BASE_URL}/fixtures",
            params={"id": match.external_id},
            headers={"x-apisports-key": settings.API_FOOTBALL_KEY},
            timeout=5,
        )
        resp.raise_for_status()
        fixtures = resp.json().get("response", [])
    except httpx.HTTPError as exc:
        logger.error("Football API request failed: %s", exc)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Football API unavailable")

    if not fixtures:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fixture not found in Football API")

    fixture_status = fixtures[0].get("fixture", {}).get("status", {})
    elapsed: Optional[int] = fixture_status.get("elapsed")
    short: Optional[str] = fixture_status.get("short")

    update_data: dict = {}
    if elapsed is not None:
        update_data["minute"] = elapsed
    if short and short in FOOTBALL_API_PHASE_MAP:
        update_data["match_phase"] = FOOTBALL_API_PHASE_MAP[short]

    if update_data:
        updated = repo.update(matchId, MatchUpdate(**update_data))
        return updated

    return match


# ------------------------------------------------------------------ #
# Lineup sub-resource                                                  #
# ------------------------------------------------------------------ #


@router.get(
    "/{matchId}/lineup",
    response_model=list[LineupPlayerResponse],
    response_model_by_alias=True,
    summary="Get match lineup",
)
def get_lineup(
    matchId: int, db: Session = Depends(get_db)
) -> list[LineupPlayerResponse]:
    repo = MatchRepository(db)
    if not repo.exists(matchId):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Match not found"
        )
    return repo.get_lineup(matchId)


@router.put(
    "/{matchId}/lineup",
    response_model=list[LineupPlayerResponse],
    response_model_by_alias=True,
    summary="Replace full match lineup (both teams)",
)
def replace_lineup(
    matchId: int,
    data: LineupBulkUpdate,
    db: Session = Depends(get_db),
) -> list[LineupPlayerResponse]:
    """Replaces the complete lineup for both teams atomically."""
    repo = MatchRepository(db)
    match = repo.get_by_id(matchId)
    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Match not found"
        )
    try:
        return repo.replace_lineup(matchId, match, data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e)
        )


# ------------------------------------------------------------------ #
# Statistics sub-resource                                              #
# ------------------------------------------------------------------ #


@router.get(
    "/{matchId}/statistics",
    response_model=list[MatchStatisticResponse],
    response_model_by_alias=True,
    summary="Get match statistics",
)
def get_statistics(
    matchId: int, db: Session = Depends(get_db)
) -> list[MatchStatisticResponse]:
    repo = MatchRepository(db)
    if not repo.exists(matchId):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Match not found"
        )
    return repo.get_statistics(matchId)


@router.patch(
    "/{matchId}/statistics",
    response_model=list[MatchStatisticResponse],
    response_model_by_alias=True,
    summary="Update statistics for both teams",
)
def update_statistics(
    matchId: int,
    data: StatisticsBulkUpdate,
    db: Session = Depends(get_db),
) -> list[MatchStatisticResponse]:
    """Upserts statistics for home and away team simultaneously."""
    repo = MatchRepository(db)
    match = repo.get_by_id(matchId)
    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Match not found"
        )
    try:
        return repo.upsert_statistics(matchId, match, data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e)
        )


# ------------------------------------------------------------------ #
# Player Statistics sub-resource                                       #
# ------------------------------------------------------------------ #


@router.get(
    "/{matchId}/player-statistics",
    response_model=list[PlayerStatisticResponse],
    response_model_by_alias=True,
    summary="Get player statistics for a match",
)
def get_player_statistics(
    matchId: int, db: Session = Depends(get_db)
) -> list[PlayerStatisticResponse]:
    repo = MatchRepository(db)
    if not repo.exists(matchId):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Match not found"
        )
    rows = (
        db.query(PlayerStatistic)
        .filter(PlayerStatistic.match_id == matchId)
        .order_by(PlayerStatistic.rating.desc().nulls_last(), PlayerStatistic.minutes.desc())
        .all()
    )
    return [PlayerStatisticResponse.model_validate(r) for r in rows]


# ------------------------------------------------------------------ #
# Injuries sub-resource                                                #
# ------------------------------------------------------------------ #


@router.get(
    "/{matchId}/injuries",
    summary="Get pre-match injury data for a match",
)
def get_injuries(
    matchId: int, db: Session = Depends(get_db)
) -> list[dict]:
    repo = MatchRepository(db)
    if not repo.exists(matchId):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Match not found"
        )
    rows = (
        db.query(SyntheticEvent)
        .filter(
            SyntheticEvent.match_id == matchId,
            SyntheticEvent.type.like("pre_match_injuries%"),
        )
        .all()
    )
    return [r.data for r in rows if r.data]