import logging
from typing import Optional

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.event import Event
from app.models.synthetic_event import SyntheticEvent
from app.repositories.match_repository import MatchRepository
from app.schemas.match import (
    LineupBulkUpdate,
    LineupPlayerResponse,
    MatchCreate,
    MatchListResponse,
    MatchResponse,
    MatchStatisticResponse,
    MatchUpdate,
    StatisticsBulkUpdate,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/matches", tags=["Matches"])


# ------------------------------------------------------------------ #
# Webhook helper                                                       #
# ------------------------------------------------------------------ #


async def _trigger_webhook(url: str, payload: dict) -> None:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload)
            logger.info("Webhook %s → %s", url, resp.status_code)
    except Exception as e:
        logger.error("Webhook %s failed: %s", url, e)


# ------------------------------------------------------------------ #
# Match CRUD                                                           #
# ------------------------------------------------------------------ #


@router.get(
    "/",
    response_model=list[MatchListResponse],
    summary="List matches",
)
def get_matches(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    team_id: Optional[int] = Query(None, gt=0),
    competition_id: Optional[int] = Query(None, gt=0),
    matchday: Optional[int] = Query(None, ge=1),
    match_state: Optional[str] = Query(
        None, description="Filter by match state (e.g. Live, PreMatch)"
    ),
    db: Session = Depends(get_db),
) -> list[MatchListResponse]:
    """
    Flexible list endpoint with query filters.
    Replaces all previous nested team/competition/matchday routes.
    """
    return MatchRepository(db).get_all(
        skip=skip,
        limit=limit,
        team_id=team_id,
        competition_id=competition_id,
        matchday=matchday,
        match_state=match_state,
    )


@router.get(
    "/live",
    response_model=list[MatchListResponse],
    summary="Get live matches",
)
def get_live_matches(db: Session = Depends(get_db)) -> list[MatchListResponse]:
    return MatchRepository(db).get_live()


@router.get(
    "/today",
    response_model=list[MatchListResponse],
    summary="Get today's matches",
)
def get_todays_matches(db: Session = Depends(get_db)) -> list[MatchListResponse]:
    return MatchRepository(db).get_today()


@router.get(
    "/{match_id}",
    response_model=MatchResponse,
    summary="Get a single match with team details",
)
def get_match(
    match_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> MatchResponse:
    match = MatchRepository(db).get_by_id(match_id)
    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Match not found"
        )

    # Trigger n8n imports in background if data is missing
    if match.external_id:
        eid = match.external_id
        if db.query(Event).filter(Event.match_id == match_id).count() == 0:
            background_tasks.add_task(
                _trigger_webhook, settings.N8N_WEBHOOK_EVENTS, {"fixture_id": eid}
            )
        if (
            db.query(SyntheticEvent).filter(SyntheticEvent.match_id == match_id).count()
            == 0
        ):
            background_tasks.add_task(
                _trigger_webhook, settings.N8N_WEBHOOK_PREMATCH, {"fixture_id": eid}
            )

    return match


@router.post(
    "/",
    response_model=MatchResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create or update a match (upsert by external_id)",
)
def create_match(
    data: MatchCreate,
    db: Session = Depends(get_db),
) -> MatchResponse:
    try:
        match, _ = MatchRepository(db).upsert(data)
        return match
    except IntegrityError:
        logger.exception("IntegrityError upserting match")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A match with this external_id already exists with conflicting data.",
        )


@router.patch(
    "/{match_id}",
    response_model=MatchResponse,
    summary="Partially update a match",
)
def update_match(
    match_id: int,
    data: MatchUpdate,
    db: Session = Depends(get_db),
) -> MatchResponse:
    if not data.model_fields_set:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Request body must contain at least one field to update.",
        )
    try:
        updated = MatchRepository(db).update(match_id, data)
    except IntegrityError:
        logger.exception("IntegrityError updating match id=%s", match_id)
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
    "/{match_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a match",
)
def delete_match(match_id: int, db: Session = Depends(get_db)) -> None:
    if not MatchRepository(db).delete(match_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Match not found"
        )


# ------------------------------------------------------------------ #
# Lineup sub-resource                                                  #
# ------------------------------------------------------------------ #


@router.get(
    "/{match_id}/lineup",
    response_model=list[LineupPlayerResponse],
    summary="Get match lineup",
)
def get_lineup(
    match_id: int, db: Session = Depends(get_db)
) -> list[LineupPlayerResponse]:
    repo = MatchRepository(db)
    if not repo.exists(match_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Match not found"
        )
    return repo.get_lineup(match_id)


@router.put(
    "/{match_id}/lineup",
    response_model=list[LineupPlayerResponse],
    summary="Replace full match lineup (both teams)",
)
def replace_lineup(
    match_id: int,
    data: LineupBulkUpdate,
    db: Session = Depends(get_db),
) -> list[LineupPlayerResponse]:
    """
    Replaces the complete lineup for both teams atomically.
    Safe to call multiple times – previous entries are deleted first.
    """
    repo = MatchRepository(db)
    match = repo.get_by_id(match_id)
    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Match not found"
        )
    try:
        return repo.replace_lineup(match_id, match, data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e)
        )


# ------------------------------------------------------------------ #
# Statistics sub-resource                                              #
# ------------------------------------------------------------------ #


@router.get(
    "/{match_id}/statistics",
    response_model=list[MatchStatisticResponse],
    summary="Get match statistics",
)
def get_statistics(
    match_id: int, db: Session = Depends(get_db)
) -> list[MatchStatisticResponse]:
    repo = MatchRepository(db)
    if not repo.exists(match_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Match not found"
        )
    return repo.get_statistics(match_id)


@router.patch(
    "/{match_id}/statistics",
    response_model=list[MatchStatisticResponse],
    summary="Update statistics for both teams",
)
def update_statistics(
    match_id: int,
    data: StatisticsBulkUpdate,
    db: Session = Depends(get_db),
) -> list[MatchStatisticResponse]:
    """
    Upserts statistics for home and away team simultaneously.
    Only provided fields are updated (partial update per team).
    """
    repo = MatchRepository(db)
    match = repo.get_by_id(match_id)
    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Match not found"
        )
    try:
        return repo.upsert_statistics(match_id, match, data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e)
        )
