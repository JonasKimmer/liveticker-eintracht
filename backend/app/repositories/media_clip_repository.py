"""
MediaClipRepository
===================
Datenbankzugriff für MediaClip (Tor-Clips, YouTube, Twitter, Instagram).
"""

import logging
from typing import Optional

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.media_clip import MediaClip
from app.schemas.media_clip import MediaClipImport

logger = logging.getLogger(__name__)


class MediaClipRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_id(self, clip_id: int) -> Optional[MediaClip]:
        return self.db.query(MediaClip).filter(MediaClip.id == clip_id).first()

    def get_by_vid(self, vid: str) -> Optional[MediaClip]:
        return self.db.query(MediaClip).filter(MediaClip.vid == vid).first()

    def get_by_match(
        self,
        match_id: int,
        include_published: bool = False,
        team_name: Optional[str] = None,
    ) -> list[MediaClip]:
        q = self.db.query(MediaClip).filter(MediaClip.match_id == match_id)
        if not include_published:
            q = q.filter(MediaClip.published.is_(False))
        if team_name:
            q = q.filter(MediaClip.team_name.ilike(f"%{team_name}%"))
        return q.order_by(MediaClip.created_at.desc()).all()

    def get_by_source(
        self, source: str, include_published: bool = False
    ) -> list[MediaClip]:
        q = self.db.query(MediaClip).filter(MediaClip.source == source)
        if not include_published:
            q = q.filter(MediaClip.published.is_(False))
        return q.order_by(MediaClip.created_at.desc()).all()

    def upsert(self, match_id: Optional[int], clip_data: MediaClipImport) -> MediaClip:
        """Insert or update a clip by vid. Handles race conditions via IntegrityError retry."""
        if clip_data.vid:
            existing = self.get_by_vid(clip_data.vid)
            if existing:
                existing.match_id = match_id or existing.match_id
                existing.thumbnail_url = clip_data.thumbnail_url or existing.thumbnail_url
                existing.title = clip_data.title or existing.title
                existing.player_name = clip_data.player_name or existing.player_name
                existing.team_name = clip_data.team_name or existing.team_name
                existing.source = clip_data.source or existing.source
                return existing

        clip = MediaClip(
            match_id=match_id,
            vid=clip_data.vid,
            video_url=clip_data.video_url,
            thumbnail_url=clip_data.thumbnail_url,
            title=clip_data.title,
            player_name=clip_data.player_name,
            team_name=clip_data.team_name,
            source=clip_data.source or "bundesliga",
        )
        self.db.add(clip)
        try:
            self.db.flush()
            return clip
        except IntegrityError:
            self.db.rollback()
            if clip_data.vid:
                winner = self.get_by_vid(clip_data.vid)
                if winner:
                    logger.debug(
                        "Clip race resolved: vid=%s already exists as id=%s",
                        clip_data.vid,
                        winner.id,
                    )
                    return winner
            raise

    def upsert_batch(self, match_id, clips_data) -> list[MediaClip]:
        """Upsert multiple clips and commit once."""
        results = [self.upsert(match_id, c) for c in clips_data]
        self.db.commit()
        for r in results:
            self.db.refresh(r)
        return results

    def publish(self, clip: MediaClip) -> None:
        clip.published = True
        self.db.commit()

    def update_thumbnail(self, clip: MediaClip, thumbnail_url: str) -> None:
        clip.thumbnail_url = thumbnail_url
        self.db.commit()

    def delete(self, clip: MediaClip) -> None:
        self.db.delete(clip)
        self.db.commit()
