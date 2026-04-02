"""
Clips Router
============
Persistente Tor-Clips aus n8n Bundesliga-Scraper.

Endpunkte:
- POST /clips/import          → n8n schickt gescrapte Clips rein
- GET  /clips/match/{match_id} → Frontend holt Clips für ein Spiel
- POST /clips/{clip_id}/draft → KI-Textentwurf generieren
- POST /clips/{clip_id}/publish → Im Ticker veröffentlichen
- DELETE /clips/{clip_id}     → Clip löschen
"""

import base64
import logging
from typing import Literal, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.constants import DEFAULT_TICKER_INSTANCE
from app.core.database import get_db
from app.utils.http_errors import require_or_404
from app.repositories.match_repository import MatchRepository
from app.repositories.media_clip_repository import MediaClipRepository
from app.repositories.ticker_entry_repository import TickerEntryRepository
from app.services import ticker_service as ts
from app.schemas.media_clip import (
    CacheThumbnailRequest,
    MediaClipImportRequest,
    MediaClipResponse,
    ClipPublishRequest,
)
from app.schemas.ticker_entry import TickerEntryResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/clips", tags=["Clips"])


# ──────────────────────────────────────────────
# POST: n8n importiert Clips
# ──────────────────────────────────────────────


@router.post(
    "/import",
    response_model=list[MediaClipResponse],
    status_code=status.HTTP_201_CREATED,
    summary="n8n: Tor-Clips in DB speichern (Upsert per vid)",
)
def import_clips(
    data: MediaClipImportRequest,
    db: Session = Depends(get_db),
) -> list[MediaClipResponse]:
    return MediaClipRepository(db).upsert_batch(data.match_id, data.clips)


# ──────────────────────────────────────────────
# GET: Clips für ein Spiel
# ──────────────────────────────────────────────


@router.get(
    "/match/{match_id}",
    response_model=list[MediaClipResponse],
    summary="Alle Clips für ein Spiel (optional nach Team filtern)",
)
def get_clips_for_match(
    match_id: int,
    team_name: Optional[str] = None,
    include_published: bool = False,
    db: Session = Depends(get_db),
) -> list[MediaClipResponse]:
    return MediaClipRepository(db).get_by_match(match_id, include_published, team_name)


# ──────────────────────────────────────────────
# GET: Clips nach Quelle (youtube / twitter / instagram)
# ──────────────────────────────────────────────


@router.get(
    "/by-source",
    response_model=list[MediaClipResponse],
    summary="Clips nach Quelle filtern (youtube, twitter, instagram)",
)
def get_clips_by_source(
    source: Literal["youtube", "twitter", "instagram"],
    include_published: bool = False,
    db: Session = Depends(get_db),
) -> list[MediaClipResponse]:
    return MediaClipRepository(db).get_by_source(source, include_published)


# ──────────────────────────────────────────────
# POST: KI-Textentwurf für Clip generieren
# ──────────────────────────────────────────────


@router.post(
    "/{clip_id}/draft",
    summary="KI-Textentwurf für Tor-Clip generieren",
)
async def generate_clip_draft(
    clip_id: int,
    match_id: int,
    style: str = "euphorisch",
    db: Session = Depends(get_db),
) -> dict:
    clip = require_or_404(MediaClipRepository(db).get_by_id(clip_id), "Clip not found")

    match = MatchRepository(db).get_by_id(match_id)
    match_context = ts.build_match_context(match, event_minute=None)

    is_youtube = clip.source == "youtube"
    try:
        text, model_used = await ts.call_llm(
            event_type="youtube_video" if is_youtube else "goal",
            event_detail=clip.title or "",
            minute=None,
            player_name=clip.player_name,
            team_name=clip.team_name,
            style=style,
            language="de",
            context_data={
                "home_team": match_context.get("home_team", ""),
                "away_team": match_context.get("away_team", ""),
                "video_title": clip.title or "",
            },
            match_context=match_context,
            db=db,
            instance=DEFAULT_TICKER_INSTANCE,
        )
    except Exception as e:
        logger.exception("Draft generation failed for clip_id=%s", clip_id)
        raise HTTPException(status_code=502, detail=f"LLM error: {e}")

    return {"text": text, "model": model_used}


# ──────────────────────────────────────────────
# POST: Clip im Ticker veröffentlichen
# ──────────────────────────────────────────────


@router.post(
    "/{clip_id}/publish",
    response_model=TickerEntryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Tor-Clip im Liveticker veröffentlichen",
)
def publish_clip(
    clip_id: int,
    data: ClipPublishRequest,
    db: Session = Depends(get_db),
) -> TickerEntryResponse:
    clip_repo = MediaClipRepository(db)
    clip = require_or_404(clip_repo.get_by_id(clip_id), "Clip not found")

    entry = TickerEntryRepository(db).create(
        ts.make_manual_entry(
            match_id=data.match_id,
            text=data.text,
            icon=data.icon or "🎬",
            minute=data.minute,
            phase=data.phase,
            image_url=clip.thumbnail_url,
            video_url=clip.video_url,
        )
    )
    clip_repo.publish(clip)
    return entry


# ──────────────────────────────────────────────
# DELETE
# ──────────────────────────────────────────────


@router.delete(
    "/{clip_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Clip löschen",
)
def delete_clip(
    clip_id: int,
    db: Session = Depends(get_db),
) -> None:
    clip_repo = MediaClipRepository(db)
    clip = require_or_404(clip_repo.get_by_id(clip_id), "Clip not found")
    clip_repo.delete(clip)


# ──────────────────────────────────────────────
# CACHE THUMBNAIL
# ──────────────────────────────────────────────


@router.post("/cache-thumbnail", summary="Instagram-Thumbnail als Base64 in DB speichern")
def cache_thumbnail(
    req: CacheThumbnailRequest,
    db: Session = Depends(get_db),
) -> dict:
    try:
        with httpx.Client(follow_redirects=True, timeout=15) as client:
            resp = client.get(
                req.thumbnail_url,
                headers={"Referer": "https://www.instagram.com/"},
            )
            resp.raise_for_status()
            image_bytes = resp.content
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Download fehlgeschlagen: {e}")

    content_type = resp.headers.get("content-type", "image/jpeg").split(";")[0]
    data_url = f"data:{content_type};base64,{base64.b64encode(image_bytes).decode()}"

    clip_repo = MediaClipRepository(db)
    clip = clip_repo.get_by_vid(req.vid)
    if clip:
        clip_repo.update_thumbnail(clip, data_url)

    return {"local_url": data_url[:80] + "…"}
