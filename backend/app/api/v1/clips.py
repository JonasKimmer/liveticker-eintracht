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
import os
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.match import Match
from app.models.media_clip import MediaClip
from app.schemas.media_clip import (
    MediaClipImportRequest,
    MediaClipResponse,
    ClipPublishRequest,
)
from app.schemas.ticker_entry import TickerEntryCreate, TickerEntryResponse
from app.repositories.ticker_entry_repository import TickerEntryRepository
from app.services.llm_service import generate_ticker_text

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
    results = []
    for c in data.clips:
        # Upsert: wenn vid bekannt, nur aktualisieren
        existing = None
        if c.vid:
            existing = db.query(MediaClip).filter(MediaClip.vid == c.vid).first()

        if existing:
            existing.match_id = data.match_id or existing.match_id
            existing.thumbnail_url = c.thumbnail_url or existing.thumbnail_url
            existing.title = c.title or existing.title
            existing.player_name = c.player_name or existing.player_name
            existing.team_name = c.team_name or existing.team_name
            existing.source = c.source or existing.source
            results.append(existing)
        else:
            clip = MediaClip(
                match_id=data.match_id,
                vid=c.vid,
                video_url=c.video_url,
                thumbnail_url=c.thumbnail_url,
                title=c.title,
                player_name=c.player_name,
                team_name=c.team_name,
                source=c.source or "bundesliga",
            )
            db.add(clip)
            db.flush()
            results.append(clip)

    db.commit()
    for r in results:
        db.refresh(r)
    return results


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
    q = db.query(MediaClip).filter(MediaClip.match_id == match_id)
    if not include_published:
        q = q.filter(MediaClip.published.is_(False))
    if team_name:
        q = q.filter(MediaClip.team_name.ilike(f"%{team_name}%"))
    return q.order_by(MediaClip.created_at.desc()).all()


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
    q = db.query(MediaClip).filter(MediaClip.source == "youtube")
    if not include_published:
        q = q.filter(MediaClip.published.is_(False))
    return q.order_by(MediaClip.created_at.desc()).all()


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
    q = db.query(MediaClip).filter(MediaClip.source == "twitter")
    if not include_published:
        q = q.filter(MediaClip.published.is_(False))
    return q.order_by(MediaClip.created_at.desc()).all()


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
    q = db.query(MediaClip).filter(MediaClip.source == "instagram")
    if not include_published:
        q = q.filter(MediaClip.published.is_(False))
    return q.order_by(MediaClip.created_at.desc()).all()


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
    clip = db.query(MediaClip).filter(MediaClip.id == clip_id).first()
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")

    match = db.query(Match).filter(Match.id == match_id).first()
    match_context = {}
    if match:
        match_context = {
            "home_team": match.home_team.name if match.home_team else "",
            "away_team": match.away_team.name if match.away_team else "",
            "home_score": match.home_score,
            "away_score": match.away_score,
            "match_state": match.match_state,
        }

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
    clip = db.query(MediaClip).filter(MediaClip.id == clip_id).first()
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")

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
            status="published",
        )
    )

    clip.published = True
    db.commit()

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
    clip = db.query(MediaClip).filter(MediaClip.id == clip_id).first()
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")
    db.delete(clip)
    db.commit()


# ──────────────────────────────────────────────
# CACHE THUMBNAIL
# ──────────────────────────────────────────────

THUMBNAILS_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
    "static", "thumbnails"
)


class CacheThumbnailRequest(BaseModel):
    vid: str
    thumbnail_url: str


@router.post("/cache-thumbnail", summary="Instagram-Thumbnail lokal speichern")
def cache_thumbnail(
    req: CacheThumbnailRequest,
    db: Session = Depends(get_db),
) -> dict:
    os.makedirs(THUMBNAILS_DIR, exist_ok=True)
    ext = ".jpg"
    filename = f"{req.vid}{ext}"
    filepath = os.path.join(THUMBNAILS_DIR, filename)

    try:
        with httpx.Client(follow_redirects=True, timeout=15) as client:
            resp = client.get(
                req.thumbnail_url,
                headers={"Referer": "https://www.instagram.com/"},
            )
            resp.raise_for_status()
            with open(filepath, "wb") as f:
                f.write(resp.content)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Download fehlgeschlagen: {e}")

    local_url = f"http://localhost:8001/static/thumbnails/{filename}"

    clip = db.query(MediaClip).filter(MediaClip.vid == req.vid).first()
    if clip:
        clip.thumbnail_url = local_url
        db.commit()

    return {"local_url": local_url}
