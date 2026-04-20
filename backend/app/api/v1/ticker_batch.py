"""
Ticker Batch Router
===================
Bulk-Endpunkte für Evaluation und Massenübersetzung.

Enthält:
- POST /ticker/generate-bulk/{match_id}   — Evaluation: alle Events neu generieren
- POST /ticker/translate-batch/{match_id} — Alle KI-Texte eines Spiels übersetzen
"""

import asyncio
import logging

from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories.event_repository import EventRepository
from app.repositories.match_repository import MatchRepository
from app.repositories.ticker_entry_repository import TickerEntryRepository
from app.schemas.ticker_entry import (
    GenerateEventRequest,
    TickerEntryUpdate,
    TickerEntryResponse,
    TickerStatus,
    TranslateBatchRequest,
)
from app.services import ticker_service as ts

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ticker", tags=["Ticker"])


@router.post(
    "/generate-bulk/{match_id}",
    response_model=list[TickerEntryResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Evaluation: Alle Events eines Spiels mit einem Provider generieren",
)
async def generate_bulk_for_match(
    match_id: int,
    data: GenerateEventRequest = Body(default_factory=GenerateEventRequest),
    db: Session = Depends(get_db),
) -> list[TickerEntryResponse]:
    events = EventRepository(db).get_by_match(match_id)
    if not events:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Keine Events für dieses Spiel",
        )

    match = MatchRepository(db).get_by_id(match_id)
    ticker_repo = TickerEntryRepository(db)
    results = []
    failed: list[tuple[int, str]] = []

    for event in events:
        match_context = ts.build_match_context(match, event.time)
        try:
            text, model_used = await ts.call_llm(
                event_type=event.event_type or "comment",
                event_detail=event.description or "",
                minute=event.time,
                style=data.style,
                language=data.language,
                context_data=ts.build_context_data(match_context, data.instance),
                match_context=match_context,
                provider=data.provider,
                model=data.model,
                db=db,
                instance=data.instance,
            )
            entry = ticker_repo.create(
                ts.make_ai_entry(
                    match_id,
                    text,
                    model_used,
                    data.style,
                    event_id=event.id,
                    instance=data.instance,
                    status=TickerStatus.draft,
                )
            )
            results.append(entry)
        except Exception as exc:
            logger.exception("Bulk generation failed for event_id=%s", event.id)
            failed.append((event.id, str(exc)))

    if failed:
        logger.warning(
            "generate-bulk match_id=%s: %d/%d events failed: %s",
            match_id,
            len(failed),
            len(events),
            failed,
        )

    return results


@router.post(
    "/translate-batch/{match_id}",
    response_model=list[TickerEntryResponse],
    summary="Alle KI-generierten Ticker-Einträge eines Spiels übersetzen",
)
async def translate_batch(
    match_id: int,
    data: TranslateBatchRequest = Body(default_factory=TranslateBatchRequest),
    db: Session = Depends(get_db),
) -> list[TickerEntryResponse]:
    ticker_repo = TickerEntryRepository(db)
    entries = ticker_repo.get_by_match(match_id, published_only=False)
    translatable = [e for e in entries if e.text]

    async def _translate_one(entry):
        try:
            translated = await ts.call_translate(entry.text, data.language)
            return ticker_repo.update(entry.id, TickerEntryUpdate(text=translated))
        except Exception:
            logger.exception("Translation failed for entry_id=%s", entry.id)
            return None

    updated = await asyncio.gather(*[_translate_one(e) for e in translatable])
    return [u for u in updated if u is not None]
