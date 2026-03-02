import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories.event_repository import EventRepository
from app.repositories.match_repository import MatchRepository
from app.schemas.event import EventCreate, EventUpdate, EventResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/matches/{match_id}/events", tags=["Events"])


def _get_match_or_404(match_id: int, db: Session):
    match = MatchRepository(db).get_by_id(match_id)
    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Match not found"
        )
    return match


@router.get(
    "/",
    response_model=list[EventResponse],
    summary="Get all events for a match",
)
def get_events(match_id: int, db: Session = Depends(get_db)) -> list[EventResponse]:
    _get_match_or_404(match_id, db)
    return EventRepository(db).get_by_match(match_id)


@router.post(
    "/",
    response_model=EventResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create or update an event (upsert by source_id)",
)
def create_event(
    match_id: int,
    data: EventCreate,
    db: Session = Depends(get_db),
) -> EventResponse:
    _get_match_or_404(match_id, db)
    try:
        event, _ = EventRepository(db).upsert(match_id, data)
        return event
    except IntegrityError:
        logger.exception("IntegrityError upserting event for match_id=%s", match_id)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Event with this source_id already exists with conflicting data.",
        )


@router.patch(
    "/{source_id}",
    response_model=EventResponse,
    summary="Update an event by source_id",
)
def update_event(
    match_id: int,
    source_id: str,
    data: EventUpdate,
    db: Session = Depends(get_db),
) -> EventResponse:
    _get_match_or_404(match_id, db)
    if not data.model_fields_set:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Request body must contain at least one field to update.",
        )
    event = EventRepository(db).update_by_source_id(source_id, data)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Event not found"
        )
    return event


@router.delete(
    "/{source_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an event by source_id",
)
def delete_event(match_id: int, source_id: str, db: Session = Depends(get_db)) -> None:
    _get_match_or_404(match_id, db)
    if not EventRepository(db).delete_by_source_id(source_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Event not found"
        )
