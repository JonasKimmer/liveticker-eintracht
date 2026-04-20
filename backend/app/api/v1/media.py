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

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.utils.http_errors import require_or_404
from app.repositories.media_queue_repository import MediaQueueRepository
from app.repositories.ticker_entry_repository import TickerEntryRepository
from app.schemas.media_queue import (
    GenerateCaptionRequest,
    MediaItemIn,
    MediaItemResponse,
    PublishMediaRequest,
)
from app.schemas.ticker_entry import (
    TickerEntryResponse,
)
from app.services import ticker_service as ts

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
            except (WebSocketDisconnect, RuntimeError):
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
    repo = MediaQueueRepository(db)
    incoming_ids = [item.media_id for item in items]
    existing_ids = repo.get_existing_ids(incoming_ids)

    saved = [item for item in items if item.media_id not in existing_ids]

    if saved:
        repo.save_batch(saved)
        payload = {
            "type": "new_media",
            "items": [i.model_dump() for i in saved],
        }
        await manager.broadcast(payload)
        logger.info(
            "Saved %d new media items and broadcasted to WS clients.", len(saved)
        )

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
    return MediaQueueRepository(db).get_pending()


# ──────────────────────────────────────────────
# DELETE /media/queue
# ──────────────────────────────────────────────


@router.delete(
    "/queue",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Alle pending Bilder aus der Queue löschen",
)
def clear_media_queue(db: Session = Depends(get_db)) -> None:
    MediaQueueRepository(db).clear_pending()


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
    media_repo = MediaQueueRepository(db)
    media = require_or_404(
        media_repo.get_by_media_id(data.media_id),
        f"Media mit media_id={data.media_id} nicht gefunden.",
    )

    entry = TickerEntryRepository(db).create(
        ts.make_manual_entry(
            match_id=data.match_id,
            text=data.description,
            icon="📷",
            minute=data.minute,
            phase=data.phase,
            image_url=media.compressed_url or media.original_url or media.thumbnail_url,
        )
    )
    media_repo.publish(media, data.description)
    return entry


# ──────────────────────────────────────────────
# POST /media/generate-caption/{media_id}
# ──────────────────────────────────────────────


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
    media = require_or_404(
        MediaQueueRepository(db).get_by_media_id(media_id), "Bild nicht gefunden"
    )

    detail = media.name or f"ScorePlay Bild #{media_id}"
    try:
        text, model = await ts.call_llm(
            event_type="comment",
            event_detail=f"Foto: {detail}",
            style=body.style,
            language="de",
            context_data={},
            match_context={},
            db=db,
            instance=body.instance,
        )
    except Exception as e:
        logger.exception("Caption generation failed for media_id=%s", media_id)
        raise HTTPException(status_code=502, detail=f"LLM error: {e}")
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
