"""
Teams Router
============
Endpunkte für Vereinsverwaltung inkl. Paginierung und externer ID-Suche.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.utils.http_errors import handle_integrity_error, require_or_404
from app.repositories.competition_repository import CompetitionRepository
from app.repositories.competition_team_repository import CompetitionTeamRepository
from app.repositories.country_repository import CountryRepository
from app.repositories.match_repository import MatchRepository
from app.repositories.team_repository import TeamRepository
from app.schemas.competition import CompetitionResponse
from app.schemas.competition_team import CompetitionTeamAssignResponse
from app.schemas.match import MatchResponse
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
# GET /teams/countries  (static – must be before /{teamId})
# ------------------------------------------------------------------ #

@router.get(
    "/countries",
    response_model=list[str],
    summary="List country names",
)
def get_countries(db: Session = Depends(get_db)) -> list[str]:
    return [c.name for c in CountryRepository(db).get_all()]


# ------------------------------------------------------------------ #
# GET /teams/partners  (static – must be before /{teamId})
# ------------------------------------------------------------------ #

@router.get(
    "/partners",
    response_model=PaginatedTeamResponse,
    response_model_by_alias=True,
    summary="List partner teams",
)
def get_partner_teams(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> PaginatedTeamResponse:
    return TeamRepository(db).get_paginated(
        page=page, page_size=page_size, is_partner=True
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
    return require_or_404(TeamRepository(db).get_by_id(teamId), "Team not found")


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
    with handle_integrity_error("A team with conflicting data already exists."):
        return TeamRepository(db).create(data)


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
    with handle_integrity_error("Update would violate a unique constraint."):
        updated = TeamRepository(db).update(teamId, data)
    return require_or_404(updated, "Team not found")


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
    require_or_404(TeamRepository(db).delete(teamId), "Team not found")


# ------------------------------------------------------------------ #
# GET /teams/by-country/{country}
# ------------------------------------------------------------------ #

@router.get(
    "/by-country/{country}",
    response_model=list[TeamResponse],
    response_model_by_alias=True,
    summary="List teams by country name",
)
def get_teams_by_country(
    country: str,
    db: Session = Depends(get_db),
) -> list[TeamResponse]:
    return TeamRepository(db).get_by_country(country)


# ------------------------------------------------------------------ #
# GET /teams/{teamId}/competitions
# ------------------------------------------------------------------ #

@router.get(
    "/{teamId}/competitions",
    response_model=list[CompetitionResponse],
    response_model_by_alias=True,
    summary="List competitions a team is assigned to",
)
def get_team_competitions(
    teamId: int,
    db: Session = Depends(get_db),
) -> list[CompetitionResponse]:
    if not TeamRepository(db).exists(teamId):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Team not found"
        )
    ct_comps = CompetitionTeamRepository(db).get_competitions_for_team(teamId)
    if ct_comps:
        return ct_comps
    return MatchRepository(db).get_competitions_for_team(teamId)


# ------------------------------------------------------------------ #
# GET /teams/{teamId}/competitions/{competitionId}/matchdays
# ------------------------------------------------------------------ #

@router.get(
    "/{teamId}/competitions/{competitionId}/matchdays",
    response_model=list[int],
    summary="List matchday numbers for a team in a competition",
)
def get_team_matchdays(
    teamId: int,
    competitionId: int,
    db: Session = Depends(get_db),
) -> list[int]:
    return MatchRepository(db).get_matchdays(teamId, competitionId)


# ------------------------------------------------------------------ #
# GET /teams/{teamId}/competitions/{competitionId}/matchdays/{round}/matches
# ------------------------------------------------------------------ #

@router.get(
    "/{teamId}/competitions/{competitionId}/matchdays/{round}/matches",
    response_model=list[MatchResponse],
    response_model_by_alias=True,
    summary="List matches for a team on a specific matchday",
)
def get_team_matches_by_matchday(
    teamId: int,
    competitionId: int,
    round: int,
    db: Session = Depends(get_db),
) -> list[MatchResponse]:
    return MatchRepository(db).get_by_competition_matchday(teamId, competitionId, round)


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
    competition = require_or_404(CompetitionRepository(db).get_by_id(competitionId), "Competition not found")

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