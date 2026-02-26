import httpx
import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings
from app.repositories.match_repository import MatchRepository
from app.models.lineup import Lineup
from app.models.match_statistic import MatchStatistic
from app.models.player_statistic import PlayerStatistic
from app.models.event import Event
from app.models.synthetic_event import SyntheticEvent
from app.schemas.match import Match, MatchCreate, MatchUpdate, MatchSimple

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/matches", tags=["matches"])


async def _trigger_webhook(url: str, payload: dict) -> None:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload)
            logger.info(f"Webhook {url}: {resp.status_code}")
    except Exception as e:
        logger.error(f"Webhook {url} failed: {e}")


@router.get("/", response_model=list[MatchSimple])
def get_matches(
    skip: int = 0,
    limit: int = 100,
    competition_id: int | None = Query(None),
    team_id: int | None = Query(None),
    matchday: int | None = Query(None),
    db: Session = Depends(get_db),
):
    repo = MatchRepository(db)
    if team_id:
        return repo.get_by_team(team_id, skip=skip, limit=limit)
    if competition_id and matchday:
        return repo.get_by_matchday(competition_id, matchday)
    if competition_id:
        return repo.get_by_competition(competition_id, skip=skip, limit=limit)
    return repo.get_all(skip=skip, limit=limit)


@router.get("/live", response_model=list[MatchSimple])
def get_live_matches(db: Session = Depends(get_db)):
    return MatchRepository(db).get_live()


@router.get("/today", response_model=list[MatchSimple])
def get_todays_matches(db: Session = Depends(get_db)):
    return MatchRepository(db).get_by_date(datetime.now())


@router.get("/{match_id}", response_model=Match)
async def get_match(
    match_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)
):
    repo = MatchRepository(db)
    match = repo.get_by_id(match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    if match.external_id:
        eid = match.external_id
        if db.query(Lineup).filter(Lineup.match_id == match_id).count() == 0:
            background_tasks.add_task(
                _trigger_webhook, settings.N8N_WEBHOOK_LINEUP, {"fixture_id": eid}
            )
        if (
            db.query(MatchStatistic).filter(MatchStatistic.match_id == match_id).count()
            == 0
        ):
            background_tasks.add_task(
                _trigger_webhook, settings.N8N_WEBHOOK_STATISTICS, {"fixture_id": eid}
            )
        if (
            db.query(PlayerStatistic)
            .filter(PlayerStatistic.match_id == match_id)
            .count()
            == 0
        ):
            background_tasks.add_task(
                _trigger_webhook,
                settings.N8N_WEBHOOK_PLAYER_STATISTICS,
                {"fixture_id": eid},
            )
        if db.query(Event).filter(Event.match_id == match_id).count() == 0:
            background_tasks.add_task(
                _trigger_webhook, settings.N8N_WEBHOOK_EVENTS, {"fixture_id": eid}
            )
        if (
            db.query(SyntheticEvent).filter(SyntheticEvent.match_id == match_id).count()
            == 0
        ):
            background_tasks.add_task(
                _trigger_webhook, settings.N8N_WEBHOOK_PREMATCH, {"fixture_id": eid}
            )

    return match


@router.post("/", response_model=Match, status_code=201)
def create_match(match: MatchCreate, db: Session = Depends(get_db)):
    return MatchRepository(db).create(match)


@router.patch("/{match_id}", response_model=Match)
def update_match(
    match_id: int, match_update: MatchUpdate, db: Session = Depends(get_db)
):
    updated = MatchRepository(db).update(match_id, match_update)
    if not updated:
        raise HTTPException(status_code=404, detail="Match not found")
    return updated


@router.delete("/{match_id}", status_code=204)
def delete_match(match_id: int, db: Session = Depends(get_db)):
    if not MatchRepository(db).delete(match_id):
        raise HTTPException(status_code=404, detail="Match not found")
