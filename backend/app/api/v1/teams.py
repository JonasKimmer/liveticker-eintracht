import logging
import time
import httpx
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings
from app.repositories.team_repository import TeamRepository
from app.repositories.match_repository import MatchRepository
from app.schemas.team import Team, TeamCreate, TeamUpdate
from app.schemas.league_season import LeagueSeason
from app.schemas.match import Match

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/teams", tags=["teams"])

_country_webhook_cooldown: dict[str, float] = {}
_matches_webhook_cooldown: dict[str, float] = {}
COOLDOWN_SECONDS = 3600  # 1 Stunde


async def _trigger_country_webhook(country_name: str) -> None:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                settings.N8N_WEBHOOK_COUNTRY,
                json={"country_name": country_name},
            )
            logger.info(
                f"Country webhook triggered for {country_name}: {resp.status_code}"
            )
    except Exception as e:
        logger.error(f"Country webhook failed for {country_name}: {e}")


async def _trigger_competitions_webhook(team_external_id: int) -> None:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                settings.N8N_WEBHOOK_COMPETITIONS,
                json={"team_external_id": team_external_id},
            )
            logger.info(
                f"Competitions webhook triggered for team {team_external_id}: {resp.status_code}"
            )
    except Exception as e:
        logger.error(f"Competitions webhook failed for team {team_external_id}: {e}")


async def _trigger_matches_webhook(
    team_external_id: int, league_external_id: int, season_year: int
) -> None:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                settings.N8N_WEBHOOK_MATCHES,
                json={
                    "team_external_id": team_external_id,
                    "league_external_id": league_external_id,
                    "season_year": season_year,
                },
            )
            logger.info(
                f"Matches webhook triggered for team {team_external_id}, league {league_external_id}: {resp.status_code}"
            )
    except Exception as e:
        logger.error(f"Matches webhook failed for team {team_external_id}: {e}")


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
    """Teams eines Landes. Triggert Import wenn noch keine vorhanden oder Cooldown abgelaufen."""
    teams = TeamRepository(db).get_by_country(country)

    cache_key = f"country:{country}"
    last_triggered = _country_webhook_cooldown.get(cache_key, 0)
    if time.time() - last_triggered > COOLDOWN_SECONDS:
        _country_webhook_cooldown[cache_key] = time.time()
        background_tasks.add_task(_trigger_country_webhook, country)
        logger.info(f"Country webhook scheduled for {country}")

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


@router.get("/{team_id}/competitions", response_model=list[LeagueSeason])
async def get_team_competitions(
    team_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)
):
    """Triggert Competition-Import wenn noch keine vorhanden."""
    team = TeamRepository(db).get_by_id(team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    competitions = MatchRepository(db).get_competitions_by_team(team_id)

    if len(competitions) == 0 and team.external_id:
        background_tasks.add_task(_trigger_competitions_webhook, team.external_id)

    return competitions


@router.get(
    "/{team_id}/competitions/{league_season_id}/matchdays", response_model=list[str]
)
async def get_team_matchdays(
    team_id: int,
    league_season_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Triggert Match-Import max. 1x pro Stunde pro Team+Competition."""
    team = TeamRepository(db).get_by_id(team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    matchdays = MatchRepository(db).get_matchdays_by_team_and_competition(
        team_id, league_season_id
    )

    if team.external_id:
        cache_key = f"{team_id}:{league_season_id}"
        last_triggered = _matches_webhook_cooldown.get(cache_key, 0)
        if time.time() - last_triggered > COOLDOWN_SECONDS:
            from app.models.league_season import LeagueSeason as LeagueSeasonModel

            ls = (
                db.query(LeagueSeasonModel)
                .filter(LeagueSeasonModel.id == league_season_id)
                .first()
            )
            if ls and ls.league and ls.league.external_id and ls.season:
                _matches_webhook_cooldown[cache_key] = time.time()
                background_tasks.add_task(
                    _trigger_matches_webhook,
                    team.external_id,
                    ls.league.external_id,
                    ls.season.year,
                )
                logger.info(
                    f"Matches webhook scheduled for team {team_id}, league_season {league_season_id}"
                )

    return matchdays


@router.get(
    "/{team_id}/competitions/{league_season_id}/matchdays/{round}/matches",
    response_model=list[Match],
)
def get_team_matches_by_matchday(
    team_id: int, league_season_id: int, round: str, db: Session = Depends(get_db)
):
    team = TeamRepository(db).get_by_id(team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return MatchRepository(db).get_by_team_competition_matchday(
        team_id, league_season_id, round
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
