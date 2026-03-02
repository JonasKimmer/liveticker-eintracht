import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories.competition_repository import CompetitionRepository
from app.repositories.competition_team_repository import CompetitionTeamRepository
from app.schemas.competition_team import CompetitionTeamAssignResponse

logger = logging.getLogger(__name__)

# No prefix – full path is built under /api/v1 via main.py
router = APIRouter(tags=["Competition Teams"])


@router.post(
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