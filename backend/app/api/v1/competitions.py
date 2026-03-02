import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories.competition_repository import CompetitionRepository
from app.schemas.competition import (
    CompetitionCreate,
    CompetitionResponse,
    CompetitionUpdate,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/competitions", tags=["Competitions"])


@router.get(
    "/",
    response_model=list[CompetitionResponse],
    summary="List competitions",
)
def get_competitions(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    hidden: Optional[bool] = Query(None, description="Filter by visibility"),
    db: Session = Depends(get_db),
) -> list[CompetitionResponse]:
    return CompetitionRepository(db).get_all(skip=skip, limit=limit, hidden=hidden)


@router.get(
    "/{competition_id}",
    response_model=CompetitionResponse,
    summary="Get a single competition",
)
def get_competition(
    competition_id: int,
    db: Session = Depends(get_db),
) -> CompetitionResponse:
    competition = CompetitionRepository(db).get_by_id(competition_id)
    if not competition:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Competition not found"
        )
    return competition


@router.post(
    "/",
    response_model=CompetitionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create or update a competition (upsert by external_id)",
)
def create_competition(
    data: CompetitionCreate,
    db: Session = Depends(get_db),
) -> CompetitionResponse:
    """
    Idempotent upsert – safe to call repeatedly from n8n import workflows.
    Matches on `external_id` if provided. Creates a new record otherwise.
    """
    try:
        competition, _ = CompetitionRepository(db).upsert(data)
        return competition
    except IntegrityError:
        logger.exception("IntegrityError upserting competition: %s", data.title)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A competition with this external_id already exists with conflicting data.",
        )


@router.patch(
    "/{competition_id}",
    response_model=CompetitionResponse,
    summary="Partially update a competition",
)
def update_competition(
    competition_id: int,
    data: CompetitionUpdate,
    db: Session = Depends(get_db),
) -> CompetitionResponse:
    """
    Partial update – only provided fields are changed.
    Fields like `source`, `external_id`, and `uid` are immutable via API.
    """
    if not data.model_fields_set:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Request body must contain at least one field to update.",
        )
    try:
        updated = CompetitionRepository(db).update(competition_id, data)
    except IntegrityError:
        logger.exception("IntegrityError updating competition id=%s", competition_id)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Update would violate a unique constraint.",
        )
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Competition not found"
        )
    return updated


@router.delete(
    "/{competition_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a competition",
)
def delete_competition(
    competition_id: int,
    db: Session = Depends(get_db),
) -> None:
    """
    Deletes a competition. Related matches keep their competition reference
    set to NULL (ON DELETE SET NULL).
    """
    if not CompetitionRepository(db).delete(competition_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Competition not found"
        )
