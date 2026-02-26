"""
Matches API Endpoints.
"""

import httpx
import asyncio
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


async def _trigger_lineup_webhook(fixture_id: int) -> None:
    """Triggert n8n Webhook für Lineup-Import (fire & forget)."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                settings.N8N_WEBHOOK_LINEUP, json={"fixture_id": fixture_id}
            )
            logger.info(
                f"Lineup webhook triggered for {fixture_id}: {resp.status_code}"
            )
    except Exception as e:
        logger.error(f"Lineup webhook failed for {fixture_id}: {e}")


async def _trigger_stats_webhook(fixture_id: int) -> None:
    """Triggert n8n Webhook für Statistics-Import (fire & forget)."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                settings.N8N_WEBHOOK_STATISTICS, json={"fixture_id": fixture_id}
            )
            logger.info(f"Stats webhook triggered for {fixture_id}: {resp.status_code}")
    except Exception as e:
        logger.error(f"Stats webhook failed for {fixture_id}: {e}")


async def _trigger_player_stats_webhook(fixture_id: int) -> None:
    """Triggert n8n Webhook für Player-Statistics-Import (fire & forget)."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                settings.N8N_WEBHOOK_PLAYER_STATISTICS, json={"fixture_id": fixture_id}
            )
            logger.info(
                f"Player stats webhook triggered for {fixture_id}: {resp.status_code}"
            )
    except Exception as e:
        logger.error(f"Player stats webhook failed for {fixture_id}: {e}")


async def _trigger_events_webhook(fixture_id: int) -> None:
    """Triggert n8n Webhook für Events-Import (fire & forget)."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                settings.N8N_WEBHOOK_EVENTS, json={"fixture_id": fixture_id}
            )
            logger.info(
                f"Events webhook triggered for {fixture_id}: {resp.status_code}"
            )
    except Exception as e:
        logger.error(f"Events webhook failed for {fixture_id}: {e}")


async def _trigger_prematch_webhook(fixture_id: int) -> None:
    """Triggert n8n Webhook für Prematch-Daten-Import (fire & forget)."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                settings.N8N_WEBHOOK_PREMATCH, json={"fixture_id": fixture_id}
            )
            logger.info(
                f"Prematch webhook triggered for {fixture_id}: {resp.status_code}"
            )
    except Exception as e:
        logger.error(f"Prematch webhook failed for {fixture_id}: {e}")


@router.get("/", response_model=list[Match])
def get_matches(
    skip: int = 0,
    limit: int = 100,
    league_season_id: int | None = Query(None),
    team_id: int | None = Query(None),
    round: str | None = Query(None),
    status: str | None = Query(None),
    db: Session = Depends(get_db),
):
    repo = MatchRepository(db)

    if team_id:
        return repo.get_by_team(team_id, skip=skip, limit=limit)
    if round and league_season_id:
        return repo.get_by_round(league_season_id, round)
    if league_season_id:
        return repo.get_by_league_season(league_season_id, skip=skip, limit=limit)
    return repo.get_all(skip=skip, limit=limit)


@router.get("/live", response_model=list[Match])
def get_live_matches(db: Session = Depends(get_db)):
    return MatchRepository(db).get_live()


@router.get("/today", response_model=list[Match])
def get_todays_matches(db: Session = Depends(get_db)):
    return MatchRepository(db).get_by_date(datetime.now())


@router.get("/{match_id}", response_model=Match)
async def get_match(
    match_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Holt Match nach ID. Triggert Lineup- und Stats-Webhook falls noch keine Daten vorhanden."""
    repo = MatchRepository(db)
    match = repo.get_by_id(match_id)

    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    lineup_count = db.query(Lineup).filter(Lineup.match_id == match_id).count()
    if lineup_count == 0 and match.external_id:
        background_tasks.add_task(_trigger_lineup_webhook, match.external_id)

    stats_count = (
        db.query(MatchStatistic).filter(MatchStatistic.match_id == match_id).count()
    )
    if stats_count == 0 and match.external_id:
        background_tasks.add_task(_trigger_stats_webhook, match.external_id)

    player_stats_count = (
        db.query(PlayerStatistic).filter(PlayerStatistic.match_id == match_id).count()
    )
    if player_stats_count == 0 and match.external_id:
        background_tasks.add_task(_trigger_player_stats_webhook, match.external_id)

    events_count = db.query(Event).filter(Event.match_id == match_id).count()
    if events_count == 0 and match.external_id:
        background_tasks.add_task(_trigger_events_webhook, match.external_id)

    synthetic_count = (
        db.query(SyntheticEvent).filter(SyntheticEvent.match_id == match_id).count()
    )
    if synthetic_count == 0 and match.external_id:
        background_tasks.add_task(_trigger_prematch_webhook, match.external_id)

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
