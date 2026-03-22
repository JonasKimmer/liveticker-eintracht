"""
Media Router
============
Endpoints für die ScorePlay Media Queue.

Flow:
  1. n8n Workflow holt Bilder via ScorePlay API
  2. POST /media/incoming  → speichert in DB + pushed via WebSocket
  3. GET  /media/queue     → Frontend lädt pending Bilder
  4. POST /media/publish   → Redakteur veröffentlicht Bild + verknüpft mit Ticker-Eintrag
  5. WS   /ws/media        → Echtzeit-Push neuer Bilder ans Dashboard
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.media_queue import MediaQueue
from app.models.ticker_entry import TickerEntry
from app.schemas.media_queue import MediaItemIn, MediaItemResponse, PublishMediaRequest
from app.schemas.ticker_entry import TickerEntryResponse, TickerStatus
from app.services.llm_service import generate_ticker_text

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────
# WebSocket Connection Manager
# ──────────────────────────────────────────────


class MediaConnectionManager:
    """Hält alle aktiven WebSocket-Verbindungen und broadcasted Nachrichten."""

    def __init__(self) -> None:
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(
            "Media WS client connected. Active connections: %d",
            len(self.active_connections),
        )

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(
            "Media WS client disconnected. Active connections: %d",
            len(self.active_connections),
        )

    async def broadcast(self, data: dict) -> None:
        """Sendet JSON an alle verbundenen Clients. Entfernt tote Verbindungen."""
        dead: list[WebSocket] = []
        for ws in self.active_connections:
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


# Singleton – wird in main.py gestartet
manager = MediaConnectionManager()

# ──────────────────────────────────────────────
# Router
# ──────────────────────────────────────────────

router = APIRouter(prefix="/media", tags=["Media"])
ws_router = APIRouter(tags=["Media WebSocket"])


# ──────────────────────────────────────────────
# POST /media/incoming  (aufgerufen von n8n)
# ──────────────────────────────────────────────


@router.post(
    "/incoming",
    status_code=status.HTTP_200_OK,
    summary="n8n: Neue ScorePlay Bilder einpflegen",
)
async def media_incoming(
    items: list[MediaItemIn],
    db: Session = Depends(get_db),
) -> dict:
    """
    Empfängt ein Array von Bildobjekten aus n8n.
    Speichert neue Bilder (ON CONFLICT wird über unique-Check gelöst),
    broadcasted sie via WebSocket an alle verbundenen Redakteur-Clients.
    """
    incoming_ids = [item.media_id for item in items]
    existing_ids = {
        row[0]
        for row in db.query(MediaQueue.media_id)
        .filter(MediaQueue.media_id.in_(incoming_ids))
        .all()
    }

    saved: list[MediaItemIn] = []
    for item in items:
        if item.media_id in existing_ids:
            continue
        db.add(MediaQueue(
            media_id=item.media_id,
            name=item.name,
            thumbnail_url=item.thumbnail_url,
            compressed_url=item.compressed_url,
            original_url=item.original_url,
            event_id=item.event_id,
            status="pending",
        ))
        saved.append(item)

    if saved:
        db.commit()
        payload = {
            "type": "new_media",
            "items": [i.model_dump() for i in saved],
        }
        await manager.broadcast(payload)
        logger.info("Saved %d new media items and broadcasted to WS clients.", len(saved))

    return {
        "saved": len(saved),
        "skipped": len(items) - len(saved),
    }


# ──────────────────────────────────────────────
# GET /media/queue
# ──────────────────────────────────────────────


@router.get(
    "/queue",
    response_model=list[MediaItemResponse],
    summary="Alle pending Bilder abrufen",
)
def media_queue(db: Session = Depends(get_db)) -> list[MediaItemResponse]:
    """Gibt alle Bilder mit Status `pending` zurück, neueste zuerst."""
    return (
        db.query(MediaQueue)
        .filter(MediaQueue.status == "pending")
        .order_by(MediaQueue.created_at.desc())
        .all()
    )


# ──────────────────────────────────────────────
# DELETE /media/queue
# ──────────────────────────────────────────────


@router.delete(
    "/queue",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Alle pending Bilder aus der Queue löschen",
)
def clear_media_queue(db: Session = Depends(get_db)) -> None:
    db.query(MediaQueue).filter(MediaQueue.status == "pending").delete()
    db.commit()


# ──────────────────────────────────────────────
# POST /media/publish
# ──────────────────────────────────────────────


@router.post(
    "/publish",
    response_model=TickerEntryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Bild auswählen → neuen Ticker-Eintrag erstellen und veröffentlichen",
)
def media_publish(
    data: PublishMediaRequest,
    db: Session = Depends(get_db),
) -> TickerEntryResponse:
    """
    Flow:
    1. Holt Bild aus media_queue
    2. Erstellt neuen Ticker-Eintrag (source=manual, status=published) mit image_url + text
    3. Setzt MediaQueue.status → 'published'
    4. Gibt den fertigen Ticker-Eintrag zurück
    """
    media = (
        db.query(MediaQueue)
        .filter(MediaQueue.media_id == data.media_id)
        .first()
    )
    if not media:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Media mit media_id={data.media_id} nicht gefunden.",
        )

    ticker = TickerEntry(
        match_id=data.match_id,
        text=data.description,
        source="manual",
        status=TickerStatus.published,
        icon=data.icon or "📷",
        minute=data.minute,
        image_url=media.compressed_url or media.original_url or media.thumbnail_url,
    )
    db.add(ticker)

    media.status = "published"
    media.description = data.description

    db.commit()
    db.refresh(ticker)
    return ticker


# ──────────────────────────────────────────────
# POST /media/generate-caption/{media_id}
# ──────────────────────────────────────────────


class GenerateCaptionRequest(BaseModel):
    style: str = "neutral"
    instance: str = "ef_whitelabel"


@router.post(
    "/generate-caption/{media_id}",
    summary="KI-Bildunterschrift für ScorePlay-Bild generieren",
)
async def generate_media_caption(
    media_id: int,
    body: GenerateCaptionRequest = GenerateCaptionRequest(),
    db: Session = Depends(get_db),
) -> dict:
    """Generiert per LLM einen Ticker-Text für ein ScorePlay-Bild."""
    media = db.query(MediaQueue).filter(MediaQueue.media_id == media_id).first()
    if not media:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bild nicht gefunden")

    detail = media.name or f"ScorePlay Bild #{media_id}"
    text, model = await generate_ticker_text(
        event_type="comment",
        event_detail=f"Foto: {detail}",
        style=body.style,
        instance=body.instance,
        db=db,
    )
    return {"text": text, "model": model}


# ──────────────────────────────────────────────
# WebSocket /ws/media
# ──────────────────────────────────────────────


@ws_router.websocket("/ws/media")
async def websocket_media(websocket: WebSocket) -> None:
    """
    WebSocket Endpoint für Echtzeit-Updates der Media Queue.
    Clients verbinden sich und empfangen neue Bilder sobald n8n welche liefert.
    Der Client kann beliebige Nachrichten senden (z.B. ping) – werden ignoriert.
    """
    await manager.connect(websocket)
    try:
        while True:
            # Verbindung offen halten; Client-Nachrichten (ping) werden verworfen
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
