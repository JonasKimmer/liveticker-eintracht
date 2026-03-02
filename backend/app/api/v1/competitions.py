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
    "",
    response_model=list[CompetitionResponse],
    response_model_by_alias=True,
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
    "/{competitionId}",
    response_model=CompetitionResponse,
    response_model_by_alias=True,
    summary="Get a single competition",
)
def get_competition(
    competitionId: int,
    db: Session = Depends(get_db),
) -> CompetitionResponse:
    competition = CompetitionRepository(db).get_by_id(competitionId)
    if not competition:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Competition not found"
        )
    return competition


@router.post(
    "",
    response_model=CompetitionResponse,
    response_model_by_alias=True,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new competition",
)
def create_competition(
    data: CompetitionCreate,
    db: Session = Depends(get_db),
) -> CompetitionResponse:
    try:
        return CompetitionRepository(db).create(data)
    except IntegrityError:
        logger.exception("IntegrityError creating competition: %s", data.title)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A competition with conflicting data already exists.",
        )


@router.put(
    "/{competitionId}",
    response_model=CompetitionResponse,
    response_model_by_alias=True,
    summary="Update an existing competition",
)
def update_competition(
    competitionId: int,
    data: CompetitionUpdate,
    db: Session = Depends(get_db),
) -> CompetitionResponse:
    if not data.model_fields_set:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Request body must contain at least one field to update.",
        )
    try:
        updated = CompetitionRepository(db).update(competitionId, data)
    except IntegrityError:
        logger.exception("IntegrityError updating competition id=%s", competitionId)
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
    "/{competitionId}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an existing competition",
)
def delete_competition(
    competitionId: int,
    db: Session = Depends(get_db),
) -> None:
    if not CompetitionRepository(db).delete(competitionId):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Competition not found"
        )
