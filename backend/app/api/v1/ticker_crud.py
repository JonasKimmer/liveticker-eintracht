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
- POST  /ticker/manual
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.constants import VALID_PHASES
from app.core.database import get_db
from app.repositories.ticker_entry_repository import TickerEntryRepository
from app.schemas.ticker_entry import (
    ManualEntryRequest,
    TickerEntryCreate,
    TickerEntryUpdate,
    TickerEntryResponse,
    TickerStatus,
)

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
    entry = TickerEntryRepository(db).get_by_id(entry_id)
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found"
        )
    return entry


@router.delete(
    "/{entry_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Ticker-Eintrag löschen",
)
def delete_ticker_entry(
    entry_id: int,
    db: Session = Depends(get_db),
) -> None:
    deleted = TickerEntryRepository(db).delete(entry_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found"
        )


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
    entry = TickerEntryRepository(db).update(entry_id, data)
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found"
        )
    return entry


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
    entry = repo.get_by_id(entry_id)
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found"
        )
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
    entry = repo.get_by_id(entry_id)
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found"
        )
    return repo.update(entry_id, TickerEntryUpdate(status=TickerStatus.rejected))


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
            return existing

    return ticker_repo.create(
        TickerEntryCreate(
            match_id=data.match_id,
            event_id=data.event_id,
            text=data.text,
            source="manual",
            style=data.style,
            icon=data.icon,
            minute=data.minute,
            phase=data.phase,
            image_url=data.image_url,
            video_url=data.video_url,
            status=data.status if data.status is not None else TickerStatus.published,
        )
    )
