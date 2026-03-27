"""
Competitions Router
===================
Endpunkte für Wettbewerbe (Ligen, Pokale) und zugehörige Saisons.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.utils.http_errors import handle_integrity_error, require_or_404
from app.repositories.competition_repository import CompetitionRepository
from app.schemas.competition import (
    CompetitionCreate,
    CompetitionResponse,
    CompetitionUpdate,
)

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
    return require_or_404(CompetitionRepository(db).get_by_id(competitionId), "Competition not found")


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
    with handle_integrity_error("A competition with conflicting data already exists."):
        return CompetitionRepository(db).create(data)


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
    with handle_integrity_error("Update would violate a unique constraint."):
        updated = CompetitionRepository(db).update(competitionId, data)
    return require_or_404(updated, "Competition not found")


@router.delete(
    "/{competitionId}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an existing competition",
)
def delete_competition(
    competitionId: int,
    db: Session = Depends(get_db),
) -> None:
    require_or_404(CompetitionRepository(db).delete(competitionId), "Competition not found")
