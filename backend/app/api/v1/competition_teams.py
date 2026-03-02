from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories.competition_team_repository import CompetitionTeamRepository
from app.schemas.competition_team import CompetitionTeamCreate, CompetitionTeamResponse

router = APIRouter(prefix="/competition-teams", tags=["Competition Teams"])


@router.get(
    "/",
    response_model=list[CompetitionTeamResponse],
    summary="List competition-team assignments",
)
def get_competition_teams(
    season_id: int | None = Query(None, gt=0),
    competition_id: int | None = Query(None, gt=0),
    team_id: int | None = Query(None, gt=0),
    db: Session = Depends(get_db),
) -> list[CompetitionTeamResponse]:
    return CompetitionTeamRepository(db).get_all(
        season_id=season_id,
        competition_id=competition_id,
        team_id=team_id,
    )


@router.post(
    "/",
    response_model=CompetitionTeamResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Assign a team to a competition in a season (idempotent)",
)
def create_competition_team(
    data: CompetitionTeamCreate,
    db: Session = Depends(get_db),
) -> CompetitionTeamResponse:
    try:
        entry, created = CompetitionTeamRepository(db).create(data)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="season_id, competition_id or team_id does not exist.",
        )
    if not created:
        # Already exists – return 200 instead of 201
        from fastapi.responses import JSONResponse
        from fastapi.encoders import jsonable_encoder

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content=jsonable_encoder(CompetitionTeamResponse.model_validate(entry)),
        )
    return entry


@router.delete(
    "/{ct_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove a team from a competition",
)
def delete_competition_team(ct_id: int, db: Session = Depends(get_db)) -> None:
    if not CompetitionTeamRepository(db).delete(ct_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found"
        )
