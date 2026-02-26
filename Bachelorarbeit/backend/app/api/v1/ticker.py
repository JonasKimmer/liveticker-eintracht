from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.core.database import get_db
from app.repositories.synthetic_event_repository import SyntheticEventRepository
from app.repositories.match_repository import MatchRepository
from app.schemas.synthetic_event import (
    SyntheticEvent,
    SyntheticEventCreate,
    GenerateSyntheticRequest,
    GenerateSyntheticResponse,
)
from app.services.llm_service import generate_ticker_text, _provider
from app.models.ticker_entry import TickerEntry
from app.models.synthetic_event import SyntheticEvent as SyntheticEventModel
from app.models.match import Match
from app.repositories.event_repository import EventRepository


router = APIRouter(prefix="/ticker", tags=["ticker"])


@router.get("/match/{match_id}/synthetic", response_model=list[SyntheticEvent])
def get_synthetic_events(match_id: int, db: Session = Depends(get_db)):
    repo = SyntheticEventRepository(db)
    return repo.get_by_match(match_id)


@router.post("/synthetic", response_model=SyntheticEvent, status_code=201)
def create_synthetic_event(data: SyntheticEventCreate, db: Session = Depends(get_db)):
    repo = SyntheticEventRepository(db)
    return repo.create(data)


@router.post("/generate-synthetic", response_model=GenerateSyntheticResponse)
async def generate_synthetic(
    req: GenerateSyntheticRequest, db: Session = Depends(get_db)
):
    syn_repo = SyntheticEventRepository(db)
    match_repo = MatchRepository(db)

    syn_event = syn_repo.get_by_id(req.synthetic_event_id)
    if not syn_event:
        raise HTTPException(status_code=404, detail="SyntheticEvent not found")

    existing = (
        db.query(TickerEntry)
        .filter(TickerEntry.synthetic_event_id == req.synthetic_event_id)
        .first()
    )
    if existing:
        return GenerateSyntheticResponse(
            ticker_entry_id=existing.id,
            synthetic_event_id=req.synthetic_event_id,
            text=existing.text,
            llm_model=existing.llm_model,
            llm_provider=existing.mode,
        )

    match = match_repo.get_by_id(syn_event.match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    match_context = {
        "home_team": match.home_team.name,
        "away_team": match.away_team.name,
        "score_home": match.score_home,
        "score_away": match.score_away,
        "status": match.status,
        "minute": syn_event.minute,
    }

    try:
        text, model_used = await generate_ticker_text(
            event_type=syn_event.event_type,
            context_data=syn_event.context_data or {},
            match_context=match_context,
            style=req.style,
            language=req.language,
            provider=req.llm_provider,
            model=req.llm_model,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM error: {str(e)}")

    entry = TickerEntry(
        match_id=syn_event.match_id,
        synthetic_event_id=req.synthetic_event_id,
        minute=syn_event.minute or 0,
        text=text,
        mode="auto",
        style=req.style,
        language=req.language,
        llm_model=model_used,
        status="published",  # ← neu
        published_at=datetime.now(timezone.utc),  # ← neu
    )
    db.add(entry)

    syn_event.ticker_text = text
    syn_event.ticker_style = req.style
    syn_event.auto_generated = True

    db.commit()
    db.refresh(entry)

    return GenerateSyntheticResponse(
        ticker_entry_id=entry.id,
        synthetic_event_id=syn_event.id,
        text=text,
        llm_model=model_used,
        llm_provider=req.llm_provider or _provider,
    )


@router.get(
    "/match/{match_id}/prematch", response_model=list[GenerateSyntheticResponse]
)
def get_prematch_entries(match_id: int, db: Session = Depends(get_db)):
    entries = (
        db.query(TickerEntry)
        .join(
            SyntheticEventModel,
            TickerEntry.synthetic_event_id == SyntheticEventModel.id,
        )
        .filter(
            TickerEntry.match_id == match_id,
            SyntheticEventModel.event_type.in_(
                [
                    "pre_match_prediction",
                    "pre_match_injuries",
                    "pre_match_h2h",
                    "pre_match_team_stats",
                    "pre_match_standings",
                ]
            ),
        )
        .all()
    )
    return [
        GenerateSyntheticResponse(
            ticker_entry_id=e.id,
            synthetic_event_id=e.synthetic_event_id,
            text=e.text,
            llm_model=e.llm_model,
            llm_provider=e.mode,
        )
        for e in entries
    ]


@router.get("/match/{match_id}/live", response_model=list[GenerateSyntheticResponse])
def get_live_entries(match_id: int, db: Session = Depends(get_db)):
    entries = (
        db.query(TickerEntry)
        .join(
            SyntheticEventModel,
            TickerEntry.synthetic_event_id == SyntheticEventModel.id,
        )
        .filter(
            TickerEntry.match_id == match_id,
            SyntheticEventModel.event_type == "live_stats_update",
        )
        .order_by(TickerEntry.created_at.desc())
        .all()
    )
    return [
        GenerateSyntheticResponse(
            ticker_entry_id=e.id,
            synthetic_event_id=e.synthetic_event_id,
            text=e.text,
            llm_model=e.llm_model,
            llm_provider=e.mode,
        )
        for e in entries
    ]


@router.post("/generate/{event_id}")
async def generate_for_event(
    event_id: int, style: str = "neutral", db: Session = Depends(get_db)
):
    from app.models.event import Event

    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    existing = db.query(TickerEntry).filter(TickerEntry.event_id == event_id).first()
    if existing:
        return {
            "ticker_entry_id": existing.id,
            "text": existing.text,
            "llm_model": existing.llm_model,
        }

    match = db.query(Match).filter(Match.id == event.match_id).first()
    match_context = {
        "home_team": match.home_team.name,
        "away_team": match.away_team.name,
        "score_home": match.score_home,
        "score_away": match.score_away,
        "status": match.status,
        "minute": event.minute,
    }

    try:
        text, model_used = await generate_ticker_text(
            event_type=event.type,
            event_detail=event.detail or "",
            minute=event.minute or 0,
            player_name=event.player_name,
            assist_name=event.assist_name,
            match_context=match_context,
            style=style,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM error: {str(e)}")

    entry = TickerEntry(
        match_id=event.match_id,
        event_id=event_id,
        minute=event.minute or 0,
        text=text,
        mode="auto",
        style=style,
        language="de",
        llm_model=model_used,
        status="published",  # ← neu
        published_at=datetime.now(timezone.utc),  # ← neu
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    return {"ticker_entry_id": entry.id, "text": text, "llm_model": model_used}
