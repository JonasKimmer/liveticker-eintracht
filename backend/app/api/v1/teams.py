import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories.competition_repository import CompetitionRepository
from app.repositories.competition_team_repository import CompetitionTeamRepository
from app.repositories.team_repository import TeamRepository
from app.schemas.competition_team import CompetitionTeamAssignResponse
from app.schemas.team import PaginatedTeamResponse, TeamCreate, TeamResponse, TeamUpdate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/teams", tags=["Teams"])

# Separate router for the nested assignment path (no prefix)
assignment_router = APIRouter(tags=["Teams"])


# ------------------------------------------------------------------ #
# GET /teams
# ------------------------------------------------------------------ #

@router.get(
    "",
    response_model=PaginatedTeamResponse,
    response_model_by_alias=True,
    summary="List teams (paginated)",
)
def get_teams(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    is_partner: Optional[bool] = Query(None, description="Filter by partner status"),
    hidden: Optional[bool] = Query(None, description="Filter by visibility"),
    db: Session = Depends(get_db),
) -> PaginatedTeamResponse:
    return TeamRepository(db).get_paginated(
        page=page, page_size=page_size, is_partner=is_partner, hidden=hidden
    )


# ------------------------------------------------------------------ #
# GET /teams/{teamId}
# ------------------------------------------------------------------ #

@router.get(
    "/{teamId}",
    response_model=TeamResponse,
    response_model_by_alias=True,
    summary="Get a single team",
)
def get_team(
    teamId: int,
    db: Session = Depends(get_db),
) -> TeamResponse:
    team = TeamRepository(db).get_by_id(teamId)
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Team not found"
        )
    return team


# ------------------------------------------------------------------ #
# POST /teams
# ------------------------------------------------------------------ #

@router.post(
    "",
    response_model=TeamResponse,
    response_model_by_alias=True,
    status_code=status.HTTP_201_CREATED,
    summary="Create a team",
)
def create_team(
    data: TeamCreate,
    db: Session = Depends(get_db),
) -> TeamResponse:
    try:
        return TeamRepository(db).create(data)
    except IntegrityError:
        logger.exception("IntegrityError creating team: %s", data.name)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A team with conflicting data already exists.",
        )


# ------------------------------------------------------------------ #
# PUT /teams/{teamId}
# ------------------------------------------------------------------ #

@router.put(
    "/{teamId}",
    response_model=TeamResponse,
    response_model_by_alias=True,
    summary="Update an existing team",
)
def update_team(
    teamId: int,
    data: TeamUpdate,
    db: Session = Depends(get_db),
) -> TeamResponse:
    if not data.model_fields_set:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Request body must contain at least one field to update.",
        )
    try:
        updated = TeamRepository(db).update(teamId, data)
    except IntegrityError:
        logger.exception("IntegrityError updating team id=%s", teamId)
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
# DELETE /teams/{teamId}
# ------------------------------------------------------------------ #

@router.delete(
    "/{teamId}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a team",
)
def delete_team(
    teamId: int,
    db: Session = Depends(get_db),
) -> None:
    if not TeamRepository(db).delete(teamId):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Team not found"
        )


# ------------------------------------------------------------------ #
# POST /seasons/{seasonId}/competitions/{competitionId}/teams/{teamId}
# ------------------------------------------------------------------ #

@assignment_router.post(
    "/seasons/{seasonId}/competitions/{competitionId}/teams/{teamId}",
    response_model=CompetitionTeamAssignResponse,
    response_model_by_alias=True,
    summary="Assign a team to a competition and a season",
)
def assign_team(
    seasonId: int,
    competitionId: int,
    teamId: int,
    db: Session = Depends(get_db),
) -> CompetitionTeamAssignResponse:
    competition = CompetitionRepository(db).get_by_id(competitionId)
    if not competition:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Competition not found"
        )

    try:
        entry, _ = CompetitionTeamRepository(db).create_by_ids(
            season_id=seasonId,
            competition_id=competitionId,
            team_id=teamId,
        )
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="seasonId, competitionId or teamId does not exist.",
        )

    return CompetitionTeamAssignResponse(
        uid=entry.uid,
        season_id=entry.season_id,
        competition_id=entry.competition_id,
        team_id=entry.team_id,
        sport=competition.sport,
    )