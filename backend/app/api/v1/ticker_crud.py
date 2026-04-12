"""
Ticker CRUD Router
==================
Lese-, Lösch- und Bearbeitungs-Endpunkte für Ticker-Einträge.

Enthält:
- GET  /ticker/match/{match_id}
- GET  /ticker/{entry_id}
- DELETE /ticker/{entry_id}
- PATCH /ticker/{entry_id}
- PATCH /ticker/{entry_id}/publish
- PATCH /ticker/{entry_id}/reject
- POST  /ticker/{entry_id}/regenerate-style
- POST  /ticker/manual
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.constants import VALID_PHASES
from app.core.database import get_db
from app.utils.http_errors import require_or_404
from app.repositories.match_repository import MatchRepository
from app.repositories.ticker_entry_repository import TickerEntryRepository
from app.schemas.ticker_entry import (
    ManualEntryRequest,
    TickerEntryUpdate,
    TickerEntryResponse,
    TickerStatus,
    TickerStyle,
)
from app.services import ticker_service as ts

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ticker", tags=["Ticker"])


@router.get(
    "/match/{match_id}",
    response_model=list[TickerEntryResponse],
    summary="Alle Ticker-Einträge eines Spiels (öffentlich)",
)
def get_match_ticker(
    match_id: int,
    all_entries: bool = Query(False, description="Auch Drafts und abgelehnte Einträge"),
    db: Session = Depends(get_db),
) -> list[TickerEntryResponse]:
    return TickerEntryRepository(db).get_by_match(
        match_id, published_only=not all_entries
    )


@router.get(
    "/{entry_id}",
    response_model=TickerEntryResponse,
    summary="Einzelnen Ticker-Eintrag abrufen",
)
def get_ticker_entry(
    entry_id: int,
    db: Session = Depends(get_db),
) -> TickerEntryResponse:
    return require_or_404(
        TickerEntryRepository(db).get_by_id(entry_id), "Entry not found"
    )


@router.delete(
    "/{entry_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Ticker-Eintrag löschen",
)
def delete_ticker_entry(
    entry_id: int,
    db: Session = Depends(get_db),
) -> None:
    require_or_404(TickerEntryRepository(db).delete(entry_id), "Entry not found")


@router.patch(
    "/{entry_id}",
    response_model=TickerEntryResponse,
    summary="Ticker-Eintrag bearbeiten (Text, Status, Stil)",
)
def update_ticker_entry(
    entry_id: int,
    data: TickerEntryUpdate,
    db: Session = Depends(get_db),
) -> TickerEntryResponse:
    if not data.model_fields_set:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Mindestens ein Feld muss gesetzt sein.",
        )
    return require_or_404(
        TickerEntryRepository(db).update(entry_id, data), "Entry not found"
    )


@router.patch(
    "/{entry_id}/publish",
    response_model=TickerEntryResponse,
    summary="Modus 3: Draft freigeben und publizieren",
)
def publish_ticker_entry(
    entry_id: int,
    db: Session = Depends(get_db),
) -> TickerEntryResponse:
    repo = TickerEntryRepository(db)
    entry = require_or_404(repo.get_by_id(entry_id), "Entry not found")
    if entry.status == TickerStatus.published:
        return entry
    return repo.update(entry_id, TickerEntryUpdate(status=TickerStatus.published))


@router.patch(
    "/{entry_id}/reject",
    response_model=TickerEntryResponse,
    summary="Modus 3: KI-Vorschlag ablehnen",
)
def reject_ticker_entry(
    entry_id: int,
    db: Session = Depends(get_db),
) -> TickerEntryResponse:
    repo = TickerEntryRepository(db)
    entry = require_or_404(repo.get_by_id(entry_id), "Entry not found")
    return repo.update(entry_id, TickerEntryUpdate(status=TickerStatus.rejected))


@router.post(
    "/{entry_id}/regenerate-style",
    response_model=TickerEntryResponse,
    summary="Statistik-Draft mit neuem Stil neu generieren",
)
async def regenerate_stats_style(
    entry_id: int,
    style: TickerStyle = Query("neutral"),
    language: str = Query("de"),
    instance: str = Query("ef_whitelabel"),
    db: Session = Depends(get_db),
) -> TickerEntryResponse:
    """Generiert den Text eines manuellen Stats-Drafts mit anderem Stil neu."""
    repo = TickerEntryRepository(db)
    entry = require_or_404(repo.get_by_id(entry_id), "Entry not found")

    match = MatchRepository(db).get_by_id(entry.match_id)
    match_context = ts.build_match_context(match, entry.minute)

    text, _ = await ts.call_llm(
        event_type="live_stats_update",
        event_detail=entry.text,
        minute=entry.minute,
        style=style,
        language=language,
        context_data={
            "home_team": match_context.get("home_team"),
            "away_team": match_context.get("away_team"),
            "triggers": [],
            "curr_stats": {},
        },
        match_context=match_context,
        db=db,
        instance=instance,
    )

    return repo.update(
        entry_id,
        TickerEntryUpdate(text=text, style=style),
    )


@router.post(
    "/manual",
    response_model=TickerEntryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Modus 1: Manuellen Ticker-Eintrag erstellen",
)
def create_manual_entry(
    data: ManualEntryRequest,
    db: Session = Depends(get_db),
) -> TickerEntryResponse:
    if data.phase and data.phase not in VALID_PHASES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Ungültige Phase '{data.phase}'. Erlaubt: {sorted(VALID_PHASES)}",
        )
    ticker_repo = TickerEntryRepository(db)
    if data.phase and not data.video_url and not data.image_url:
        existing = ticker_repo.get_by_phase(data.match_id, data.phase)
        if existing:
            # Never overwrite a published entry — return it unchanged
            if existing.status == TickerStatus.published:
                return existing
            update_data: dict = {}
            if data.text:
                update_data["text"] = data.text
            if data.status is not None:
                update_data["status"] = data.status
            if update_data:
                return ticker_repo.update(existing.id, TickerEntryUpdate(**update_data))
            return existing

    return ticker_repo.create(
        ts.make_manual_entry(
            match_id=data.match_id,
            event_id=data.event_id,
            text=data.text,
            style=data.style,
            instance=data.instance,
            icon=data.icon,
            llm_model=data.llm_model,
            source=data.source or "manual",
            minute=data.minute,
            phase=data.phase,
            image_url=data.image_url,
            video_url=data.video_url,
            status=data.status if data.status is not None else TickerStatus.published,
        )
    )
