"""
MediaQueueRepository
====================
Datenbankzugriff für MediaQueue (ScorePlay-Bilder-Queue).
"""

import logging
from typing import Optional

from sqlalchemy.orm import Session

from app.models.media_queue import MediaQueue
from app.schemas.media_queue import MediaItemIn

logger = logging.getLogger(__name__)


class MediaQueueRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_existing_ids(self, media_ids: list[int]) -> set[int]:
        rows = (
            self.db.query(MediaQueue.media_id)
            .filter(MediaQueue.media_id.in_(media_ids))
            .all()
        )
        return {row[0] for row in rows}

    def get_pending(self) -> list[MediaQueue]:
        return (
            self.db.query(MediaQueue)
            .filter(MediaQueue.status == "pending")
            .order_by(MediaQueue.created_at.desc())
            .all()
        )

    def get_by_media_id(self, media_id: int) -> Optional[MediaQueue]:
        return (
            self.db.query(MediaQueue)
            .filter(MediaQueue.media_id == media_id)
            .first()
        )

    def save(self, item: MediaItemIn) -> MediaQueue:
        obj = MediaQueue(
            media_id=item.media_id,
            name=item.name,
            thumbnail_url=item.thumbnail_url,
            compressed_url=item.compressed_url,
            original_url=item.original_url,
            event_id=item.event_id,
            status="pending",
        )
        self.db.add(obj)
        return obj

    def save_batch(self, items) -> list:
        """Add multiple items and commit once."""
        objs = [self.save(item) for item in items]
        self.db.commit()
        return objs

    def clear_pending(self) -> None:
        self.db.query(MediaQueue).filter(MediaQueue.status == "pending").delete()
        self.db.commit()

    def publish(self, media: MediaQueue, description: str) -> None:
        media.status = "published"
        media.description = description
        self.db.commit()
