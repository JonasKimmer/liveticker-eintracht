"""
Events Router
=============
Endpunkte für Match-Events (Tore, Karten, Wechsel) inkl. Upsert.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.utils.http_errors import handle_integrity_error, require_or_404
from app.repositories.event_repository import EventRepository
from app.repositories.match_repository import MatchRepository
from app.models.match import Match
from app.schemas.event import (
    EventCreate,
    EventResponse,
    EventUpdate,
    PaginatedEventResponse,
)

router = APIRouter(prefix="/matches/{matchId}/events", tags=["Events"])


def _get_match_or_404(match_id: int, db: Session) -> Match:
    return require_or_404(MatchRepository(db).get_by_id(match_id), "Match not found")


@router.get(
    "",
    response_model=PaginatedEventResponse,
    response_model_by_alias=True,
    summary="Get all events for a match (paginated)",
)
def get_events(
    matchId: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500, alias="pageSize"),
    db: Session = Depends(get_db),
) -> PaginatedEventResponse:
    _get_match_or_404(matchId, db)
    items, total = EventRepository(db).get_by_match_paginated(
        matchId, page=page, page_size=page_size
    )
    return PaginatedEventResponse.create(
        items=[EventResponse.model_validate(e) for e in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post(
    "",
    response_model=EventResponse,
    response_model_by_alias=True,
    status_code=status.HTTP_201_CREATED,
    summary="Create or update an event (upsert by sourceId)",
)
def create_event(
    matchId: int,
    data: EventCreate,
    db: Session = Depends(get_db),
) -> EventResponse:
    _get_match_or_404(matchId, db)
    with handle_integrity_error(
        "Event with this sourceId already exists with conflicting data."
    ):
        event, _ = EventRepository(db).upsert(matchId, data)
        return event


@router.patch(
    "/{sourceId}",
    response_model=EventResponse,
    response_model_by_alias=True,
    summary="Update an event by sourceId",
)
def update_event(
    matchId: int,
    sourceId: str,
    data: EventUpdate,
    db: Session = Depends(get_db),
) -> EventResponse:
    _get_match_or_404(matchId, db)
    if not data.model_fields_set:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Request body must contain at least one field to update.",
        )
    return require_or_404(
        EventRepository(db).update_by_source_id(sourceId, data), "Event not found"
    )


@router.delete(
    "/{sourceId}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an event by sourceId",
)
def delete_event(matchId: int, sourceId: str, db: Session = Depends(get_db)) -> None:
    _get_match_or_404(matchId, db)
    require_or_404(EventRepository(db).delete_by_source_id(sourceId), "Event not found")
