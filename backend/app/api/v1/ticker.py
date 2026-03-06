import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.event import Event
from app.models.match import Match
from app.models.synthetic_event import SyntheticEvent
from app.repositories.ticker_entry_repository import TickerEntryRepository
from app.schemas.ticker_entry import (
    TickerEntryCreate,
    TickerEntryUpdate,
    TickerEntryResponse,
)
from app.services.llm_service import generate_ticker_text

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ticker", tags=["Ticker"])


@router.get(
    "/match/{match_id}",
    response_model=list[TickerEntryResponse],
    summary="Get published ticker entries for a match",
)
def get_match_ticker(
    match_id: int,
    all_entries: bool = Query(False, description="Include drafts and rejected entries"),
    db: Session = Depends(get_db),
) -> list[TickerEntryResponse]:
    return TickerEntryRepository(db).get_by_match(
        match_id, published_only=not all_entries
    )


@router.get(
    "/{entry_id}",
    response_model=TickerEntryResponse,
    summary="Get a single ticker entry",
)
def get_ticker_entry(
    entry_id: int, db: Session = Depends(get_db)
) -> TickerEntryResponse:
    entry = TickerEntryRepository(db).get_by_id(entry_id)
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found"
        )
    return entry


@router.patch(
    "/{entry_id}",
    response_model=TickerEntryResponse,
    summary="Update a ticker entry (text, status, style)",
)
def update_ticker_entry(
    entry_id: int,
    data: TickerEntryUpdate,
    db: Session = Depends(get_db),
) -> TickerEntryResponse:
    if not data.model_fields_set:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Request body must contain at least one field to update.",
        )
    entry = TickerEntryRepository(db).update(entry_id, data)
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found"
        )
    return entry


@router.post(
    "/generate/{event_id}",
    response_model=TickerEntryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate a ticker entry via LLM for an event",
)
async def generate_for_event(
    event_id: int,
    style: str = Query("neutral", max_length=50),
    db: Session = Depends(get_db),
) -> TickerEntryResponse:
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Event not found"
        )

    # Return existing entry if already generated
    repo = TickerEntryRepository(db)
    existing = repo.get_by_event(event_id)
    if existing:
        return existing

    match = db.query(Match).filter(Match.id == event.match_id).first()
    match_context = {
        "home_team": match.home_team.name if match and match.home_team else "",
        "away_team": match.away_team.name if match and match.away_team else "",
        "home_score": match.home_score if match else None,
        "away_score": match.away_score if match else None,
        "match_state": match.match_state if match else None,
        "minute": event.time,
    }

    try:
        text, model_used = await generate_ticker_text(
            event_type=event.event_type or event.description or "update",
            context_data={},
            match_context=match_context,
            style=style,
        )
    except Exception as e:
        logger.exception("LLM generation failed for event_id=%s", event_id)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail=f"LLM error: {e}"
        )

    return repo.create(
        TickerEntryCreate(
            match_id=event.match_id,
            event_id=event_id,
            text=text,
            source="ai",
            style=style,
            llm_model=model_used,
            status="published",
        )
    )


class GenerateSyntheticRequest(BaseModel):
    synthetic_event_id: int
    style: str = "neutral"


@router.post(
    "/generate-synthetic",
    response_model=TickerEntryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate a ticker entry via LLM for a synthetic event",
)
async def generate_for_synthetic_event(
    data: GenerateSyntheticRequest,
    db: Session = Depends(get_db),
) -> TickerEntryResponse:
    synthetic = (
        db.query(SyntheticEvent)
        .filter(SyntheticEvent.id == data.synthetic_event_id)
        .first()
    )
    if not synthetic:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="SyntheticEvent not found"
        )

    match = db.query(Match).filter(Match.id == synthetic.match_id).first()
    match_context = {
        "home_team": match.home_team.name if match and match.home_team else "",
        "away_team": match.away_team.name if match and match.away_team else "",
        "home_score": match.home_score if match else None,
        "away_score": match.away_score if match else None,
        "match_state": match.match_state if match else None,
        "minute": synthetic.minute,
    }

    try:
        text, model_used = await generate_ticker_text(
            event_type=synthetic.type or "update",
            context_data=synthetic.data or {},
            match_context=match_context,
            style=data.style,
        )
    except Exception as e:
        logger.exception(
            "LLM generation failed for synthetic_event_id=%s", data.synthetic_event_id
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail=f"LLM error: {e}"
        )

    return TickerEntryRepository(db).create(
        TickerEntryCreate(
            match_id=synthetic.match_id,
            text=text,
            source="ai",
            style=data.style,
            llm_model=model_used,
            status="published",
        )
    )
