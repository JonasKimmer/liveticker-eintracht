from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.core.database import get_db
from app.services.llm_service import generate_ticker_text
from app.models.ticker_entry import TickerEntry
from app.models.match import Match
from app.models.event import Event

router = APIRouter(prefix="/ticker", tags=["ticker"])


@router.get("/")
def get_ticker_entries(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(TickerEntry).offset(skip).limit(limit).all()


@router.get("/match/{match_id}")
def get_match_ticker(match_id: int, db: Session = Depends(get_db)):
    return (
        db.query(TickerEntry)
        .filter(TickerEntry.match_id == match_id, TickerEntry.status == "published")
        .order_by(TickerEntry.created_at.desc())
        .all()
    )


@router.get("/{entry_id}")
def get_ticker_entry(entry_id: int, db: Session = Depends(get_db)):
    entry = db.query(TickerEntry).filter(TickerEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    return entry


@router.post("/", status_code=201)
def create_ticker_entry(data: dict, db: Session = Depends(get_db)):
    entry = TickerEntry(**data)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.patch("/{entry_id}")
def update_ticker_entry(entry_id: int, data: dict, db: Session = Depends(get_db)):
    entry = db.query(TickerEntry).filter(TickerEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    for k, v in data.items():
        setattr(entry, k, v)
    db.commit()
    db.refresh(entry)
    return entry


@router.post("/{entry_id}/publish")
def publish_ticker_entry(entry_id: int, db: Session = Depends(get_db)):
    entry = db.query(TickerEntry).filter(TickerEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    entry.status = "published"
    db.commit()
    db.refresh(entry)
    return entry


@router.post("/generate/{event_id}")
async def generate_for_event(
    event_id: int, style: str = "neutral", db: Session = Depends(get_db)
):
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
        "home_team": match.home_team.name if match.home_team else "",
        "away_team": match.away_team.name if match.away_team else "",
        "home_score": match.home_score,
        "away_score": match.away_score,
        "match_state": match.match_state,
        "minute": event.time,
    }

    try:
        text, model_used = await generate_ticker_text(
            event_type=event.description or "update",
            context_data={},
            match_context=match_context,
            style=style,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM error: {str(e)}")

    entry = TickerEntry(
        match_id=event.match_id,
        event_id=event_id,
        text=text,
        source="ai",
        style=style,
        llm_model=model_used,
        status="published",
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return {"ticker_entry_id": entry.id, "text": text, "llm_model": model_used}
