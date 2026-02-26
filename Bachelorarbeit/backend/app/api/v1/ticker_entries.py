from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories.ticker_entry_repository import TickerEntryRepository
from app.repositories.event_repository import EventRepository
from app.repositories.team_repository import TeamRepository
from app.schemas.ticker_entry import TickerEntry, TickerEntryCreate, TickerEntryUpdate
from app.services.llm_service import llm_service

router = APIRouter(prefix="/ticker", tags=["ticker"])


@router.get("/", response_model=list[TickerEntry])
def get_ticker_entries(
    skip: int = 0,
    limit: int = 100,
    mode: str | None = Query(None, pattern="^(auto|hybrid|manual)$"),
    db: Session = Depends(get_db),
):
    repo = TickerEntryRepository(db)
    if mode:
        return repo.get_by_mode(mode, skip=skip, limit=limit)
    return repo.get_all(skip=skip, limit=limit)


@router.get("/match/{match_id}", response_model=list[TickerEntry])
def get_match_ticker(
    match_id: int,
    published_only: bool = Query(False),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    repo = TickerEntryRepository(db)
    if published_only:
        return repo.get_published(match_id)
    return repo.get_by_match(match_id, skip=skip, limit=limit)


@router.get("/{entry_id}", response_model=TickerEntry)
def get_ticker_entry(entry_id: int, db: Session = Depends(get_db)):
    repo = TickerEntryRepository(db)
    entry = repo.get_by_id(entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Ticker entry not found")
    return entry


@router.post("/", response_model=TickerEntry, status_code=201)
def create_ticker_entry(entry: TickerEntryCreate, db: Session = Depends(get_db)):
    repo = TickerEntryRepository(db)
    return repo.create(entry)


@router.post("/generate/{event_id}", response_model=TickerEntry, status_code=201)
def generate_ticker_for_event(
    event_id: int,
    style: str = Query("neutral", pattern="^(neutral|euphorisch|kritisch)$"),
    mode: str = Query("auto", pattern="^(auto|hybrid|manual)$"),
    db: Session = Depends(get_db),
):
    event_repo = EventRepository(db)
    team_repo = TeamRepository(db)
    ticker_repo = TickerEntryRepository(db)

    event = event_repo.get_by_id(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    team = team_repo.get_by_id(event.team_id)
    team_name = team.name if team else "Unknown Team"

    context_data = None
    if event.type in ("Goal", "goal"):
        context_data = {
            "player_name": event.player_name,
            "assist": event.assist_name,
            "team_name": team_name,
        }

    generated_text = llm_service.generate_ticker_text(
        event_type=event.type,
        event_detail=event.detail,
        minute=event.minute,
        player_name=event.player_name,
        assist_name=event.assist_name,
        team_name=team_name,
        style=style,
        context_data=context_data,
    )

    ticker_data = TickerEntryCreate(
        match_id=event.match_id,
        event_id=event.id,
        minute=event.minute,
        text=generated_text,
        mode=mode,
        style=style,
        language="de",
        llm_model="mock" if llm_service.provider == "mock" else llm_service.provider,
        status="published",  # ← direkt publishen
    )

    return ticker_repo.create(ticker_data)


@router.post("/{entry_id}/publish", response_model=TickerEntry)
def publish_ticker_entry(entry_id: int, db: Session = Depends(get_db)):
    repo = TickerEntryRepository(db)
    published = repo.publish(entry_id)
    if not published:
        raise HTTPException(status_code=404, detail="Ticker entry not found")
    return published


@router.patch("/{entry_id}", response_model=TickerEntry)
def update_ticker_entry(
    entry_id: int, entry_update: TickerEntryUpdate, db: Session = Depends(get_db)
):
    repo = TickerEntryRepository(db)
    updated = repo.update(entry_id, entry_update)
    if not updated:
        raise HTTPException(status_code=404, detail="Ticker entry not found")
    return updated
