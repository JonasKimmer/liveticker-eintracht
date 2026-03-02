import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories.team_repository import TeamRepository
from app.schemas.team import TeamCreate, TeamResponse, TeamUpdate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/teams", tags=["Teams"])


# ------------------------------------------------------------------ #
# GET /teams
# ------------------------------------------------------------------ #


@router.get(
    "/",
    response_model=list[TeamResponse],
    summary="List teams",
)
def get_teams(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    is_partner: Optional[bool] = Query(None, description="Filter by partner status"),
    hidden: Optional[bool] = Query(None, description="Filter by visibility"),
    db: Session = Depends(get_db),
) -> list[TeamResponse]:
    """
    Returns all teams. Use `is_partner=true` to get partner teams only
    (replaces the old `/teams/partners` endpoint).
    """
    return TeamRepository(db).get_all(
        skip=skip, limit=limit, is_partner=is_partner, hidden=hidden
    )


# ------------------------------------------------------------------ #
# GET /teams/{team_id}
# ------------------------------------------------------------------ #


@router.get(
    "/{team_id}",
    response_model=TeamResponse,
    summary="Get a single team",
)
def get_team(
    team_id: int,
    db: Session = Depends(get_db),
) -> TeamResponse:
    team = TeamRepository(db).get_by_id(team_id)
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Team not found"
        )
    return team


# ------------------------------------------------------------------ #
# POST /teams
# ------------------------------------------------------------------ #


@router.post(
    "/",
    response_model=TeamResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a team",
)
def create_team(
    data: TeamCreate,
    db: Session = Depends(get_db),
) -> TeamResponse:
    """
    Creates a new team. If `external_id` is provided and already exists,
    the existing team is returned (upsert semantics – safe for n8n imports).
    """
    try:
        team, _ = TeamRepository(db).upsert(data)
        return team
    except IntegrityError:
        logger.exception("IntegrityError creating team: %s", data.name)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A team with this external_id already exists.",
        )


# ------------------------------------------------------------------ #
# PATCH /teams/{team_id}
# ------------------------------------------------------------------ #


@router.patch(
    "/{team_id}",
    response_model=TeamResponse,
    summary="Partially update a team",
)
def update_team(
    team_id: int,
    data: TeamUpdate,
    db: Session = Depends(get_db),
) -> TeamResponse:
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
        updated = TeamRepository(db).update(team_id, data)
    except IntegrityError:
        logger.exception("IntegrityError updating team id=%s", team_id)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Update would violate a unique constraint.",
        )
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Team not found"
        )
    return updated


# ------------------------------------------------------------------ #
# DELETE /teams/{team_id}
# ------------------------------------------------------------------ #


@router.delete(
    "/{team_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a team",
)
def delete_team(
    team_id: int,
    db: Session = Depends(get_db),
) -> None:
    """
    Deletes a team. Related matches keep their team reference set to NULL
    (ON DELETE SET NULL). Favorites are cascade-deleted.
    """
    if not TeamRepository(db).delete(team_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Team not found"
        )
