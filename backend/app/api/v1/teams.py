import logging
import time
import httpx
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories.team_repository import TeamRepository
from app.repositories.match_repository import MatchRepository
from app.schemas.team import Team, TeamCreate, TeamUpdate
from app.schemas.match import MatchSimple

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/teams", tags=["teams"])

_webhook_cooldown: dict[str, float] = {}
COOLDOWN_SECONDS = 3600


async def _trigger_webhook(url: str, payload: dict) -> None:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload)
            logger.info(f"Webhook {url}: {resp.status_code}")
    except Exception as e:
        logger.error(f"Webhook {url} failed: {e}")


@router.get("/countries", response_model=list[str])
def get_countries(db: Session = Depends(get_db)):
    return TeamRepository(db).get_countries()


@router.get("/partners", response_model=list[Team])
def get_partner_teams(db: Session = Depends(get_db)):
    return TeamRepository(db).get_partners()


@router.get("/by-country/{country}", response_model=list[Team])
async def get_teams_by_country(
    country: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)
):
    teams = TeamRepository(db).get_by_country(country)
    key = f"country:{country}"
    if time.time() - _webhook_cooldown.get(key, 0) > COOLDOWN_SECONDS:
        _webhook_cooldown[key] = time.time()
        if hasattr(settings, "N8N_WEBHOOK_COUNTRY"):
            background_tasks.add_task(
                _trigger_webhook,
                settings.N8N_WEBHOOK_COUNTRY,
                {"country_name": country},
            )
    return teams


@router.get("/", response_model=list[Team])
def get_teams(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return TeamRepository(db).get_all(skip=skip, limit=limit)


@router.get("/{team_id}", response_model=Team)
def get_team(team_id: int, db: Session = Depends(get_db)):
    team = TeamRepository(db).get_by_id(team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team


@router.get("/{team_id}/competitions")
async def get_team_competitions(
    team_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)
):
    team = TeamRepository(db).get_by_id(team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    competitions = MatchRepository(db).get_competitions_by_team(team_id)
    if (
        len(competitions) == 0
        and team.external_id
        and hasattr(settings, "N8N_WEBHOOK_COMPETITIONS")
    ):
        background_tasks.add_task(
            _trigger_webhook,
            settings.N8N_WEBHOOK_COMPETITIONS,
            {"team_external_id": team.external_id},
        )
    return competitions


@router.get(
    "/{team_id}/competitions/{competition_id}/matchdays", response_model=list[int]
)
def get_team_matchdays(
    team_id: int, competition_id: int, db: Session = Depends(get_db)
):
    team = TeamRepository(db).get_by_id(team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return MatchRepository(db).get_matchdays_by_team_and_competition(
        team_id, competition_id
    )


@router.get(
    "/{team_id}/competitions/{competition_id}/matchdays/{matchday}/matches",
    response_model=list[MatchSimple],
)
def get_team_matches_by_matchday(
    team_id: int, competition_id: int, matchday: int, db: Session = Depends(get_db)
):
    team = TeamRepository(db).get_by_id(team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return MatchRepository(db).get_by_team_competition_matchday(
        team_id, competition_id, matchday
    )


@router.post("/", response_model=Team, status_code=201)
def create_team(team: TeamCreate, db: Session = Depends(get_db)):
    return TeamRepository(db).create(team)


@router.patch("/{team_id}", response_model=Team)
def update_team(team_id: int, team_update: TeamUpdate, db: Session = Depends(get_db)):
    updated = TeamRepository(db).update(team_id, team_update)
    if not updated:
        raise HTTPException(status_code=404, detail="Team not found")
    return updated
