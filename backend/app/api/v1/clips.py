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

import logging
from pathlib import Path
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
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
from app.schemas.ticker_entry import TickerEntryCreate, TickerEntryResponse, TickerStatus
from app.services.llm_service import generate_ticker_text

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/clips", tags=["Clips"])

THUMBNAILS_DIR = Path(__file__).parents[3] / "static" / "thumbnails"


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
# GET: YouTube-Videos (source='youtube', kein match_id Pflicht)
# ──────────────────────────────────────────────


@router.get(
    "/youtube",
    response_model=list[MediaClipResponse],
    summary="Alle YouTube-Videos aus DB (source=youtube)",
)
def get_youtube_clips(
    include_published: bool = False,
    db: Session = Depends(get_db),
) -> list[MediaClipResponse]:
    return MediaClipRepository(db).get_by_source("youtube", include_published)


# ──────────────────────────────────────────────
# GET: Twitter/X Posts (source='twitter')
# ──────────────────────────────────────────────


@router.get(
    "/twitter",
    response_model=list[MediaClipResponse],
    summary="Alle Twitter/X-Posts aus DB (source=twitter)",
)
def get_twitter_posts(
    include_published: bool = False,
    db: Session = Depends(get_db),
) -> list[MediaClipResponse]:
    return MediaClipRepository(db).get_by_source("twitter", include_published)


# ──────────────────────────────────────────────
# GET: Instagram Posts (source='instagram')
# ──────────────────────────────────────────────


@router.get(
    "/instagram",
    response_model=list[MediaClipResponse],
    summary="Alle Instagram-Posts aus DB (source=instagram)",
)
def get_instagram_posts(
    include_published: bool = False,
    db: Session = Depends(get_db),
) -> list[MediaClipResponse]:
    return MediaClipRepository(db).get_by_source("instagram", include_published)


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
    clip = MediaClipRepository(db).get_by_id(clip_id)
    if not clip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Clip not found")

    match = MatchRepository(db).load_with_teams(match_id)
    match_context = ts.build_match_context(match, event_minute=None)

    is_youtube = clip.source == "youtube"
    try:
        text, model_used = await generate_ticker_text(
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
            instance="ef_whitelabel",
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
    clip = clip_repo.get_by_id(clip_id)
    if not clip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Clip not found")

    entry = TickerEntryRepository(db).create(
        TickerEntryCreate(
            match_id=data.match_id,
            text=data.text,
            source="manual",
            icon=data.icon or "🎬",
            minute=data.minute,
            phase=data.phase,
            image_url=clip.thumbnail_url,
            video_url=clip.video_url,
            status=TickerStatus.published,
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
    clip = clip_repo.get_by_id(clip_id)
    if not clip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Clip not found")
    clip_repo.delete(clip)


# ──────────────────────────────────────────────
# CACHE THUMBNAIL
# ──────────────────────────────────────────────


@router.post("/cache-thumbnail", summary="Instagram-Thumbnail lokal speichern")
def cache_thumbnail(
    req: CacheThumbnailRequest,
    db: Session = Depends(get_db),
) -> dict:
    THUMBNAILS_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{req.vid}.jpg"
    filepath = THUMBNAILS_DIR / filename

    try:
        with httpx.Client(follow_redirects=True, timeout=15) as client:
            resp = client.get(
                req.thumbnail_url,
                headers={"Referer": "https://www.instagram.com/"},
            )
            resp.raise_for_status()
            filepath.write_bytes(resp.content)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Download fehlgeschlagen: {e}")

    local_url = f"{settings.PUBLIC_BASE_URL}/static/thumbnails/{filename}"

    clip_repo = MediaClipRepository(db)
    clip = clip_repo.get_by_vid(req.vid)
    if clip:
        clip_repo.update_thumbnail(clip, local_url)

    return {"local_url": local_url}
