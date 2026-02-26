# app/api/v1/events.py
"""
Events API Endpoints.
GET /api/v1/events - Liste aller Events
GET /api/v1/events/match/{match_id} - Events für ein Match
GET /api/v1/events/{id} - Einzelnes Event
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories.event_repository import EventRepository
from app.schemas.event import Event, EventCreate, EventUpdate


router = APIRouter(prefix="/events", tags=["events"])


@router.get("/", response_model=list[Event])
def get_events(
    skip: int = 0,
    limit: int = 100,
    match_id: int | None = Query(None),  # ← NEU!
    event_type: str | None = Query(None, max_length=50),
    db: Session = Depends(get_db),
):
    """
    Holt alle Events mit Pagination und optionalen Filtern.

    - **skip**: Anzahl zu überspringender Einträge (default: 0)
    - **limit**: Max. Anzahl Ergebnisse (default: 100)
    - **match_id**: Optional - Filter nach Match-ID
    - **event_type**: Optional - Filter nach Typ (goal, card, substitution, etc.)
    """
    repo = EventRepository(db)

    # Filter nach Match-ID (WICHTIGSTER Filter!)
    if match_id:
        return repo.get_by_match(match_id, skip=skip, limit=limit)

    # Filter nach Typ
    if event_type:
        return repo.get_by_type(event_type, skip=skip, limit=limit)

    # Alle Events
    return repo.get_all(skip=skip, limit=limit)


@router.get("/match/{match_id}", response_model=list[Event])
def get_match_events(
    match_id: int, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)
):
    """
    Holt alle Events für ein bestimmtes Match, chronologisch sortiert.

    - **match_id**: Match-ID
    - **skip**: Anzahl zu überspringender Einträge (default: 0)
    - **limit**: Max. Anzahl Ergebnisse (default: 100)
    """
    repo = EventRepository(db)
    return repo.get_by_match(match_id, skip=skip, limit=limit)


@router.get("/{event_id}", response_model=Event)
def get_event(event_id: int, db: Session = Depends(get_db)):
    """
    Holt einzelnes Event nach ID.

    - **event_id**: Event-ID
    """
    repo = EventRepository(db)
    event = repo.get_by_id(event_id)

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    return event


@router.post("/", response_model=Event, status_code=201)
def create_event(event: EventCreate, db: Session = Depends(get_db)):
    """
    Erstellt neues Event.

    - **event**: Event-Daten
    """
    repo = EventRepository(db)
    return repo.create(event)


@router.patch("/{event_id}", response_model=Event)
def update_event(
    event_id: int, event_update: EventUpdate, db: Session = Depends(get_db)
):
    """
    Aktualisiert Event.

    - **event_id**: Event-ID
    - **event_update**: Zu aktualisierende Felder
    """
    repo = EventRepository(db)
    updated_event = repo.update(event_id, event_update)

    if not updated_event:
        raise HTTPException(status_code=404, detail="Event not found")

    return updated_event
