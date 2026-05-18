from sqlalchemy import Column, Index, Integer, String, Text, Boolean, TIMESTAMP, ForeignKey, text
from sqlalchemy.sql import func
from app.core.database import Base


class MediaClip(Base):
    __tablename__ = "media_clips"
    __table_args__ = (
        # Partial unique index: ein vid darf nur einmal existieren (NULL erlaubt mehrfach)
        Index("uq_media_clips_vid", "vid", unique=True, postgresql_where=text("vid IS NOT NULL")),
    )

    id = Column(Integer, primary_key=True)
    match_id = Column(
        Integer, ForeignKey("matches.id", ondelete="SET NULL"), nullable=True, index=True
    )
    vid = Column(String(100), nullable=True)          # JW Player video ID
    video_url = Column(Text, nullable=False)           # iframe embed URL
    thumbnail_url = Column(Text, nullable=True)
    title = Column(Text, nullable=True)
    player_name = Column(Text, nullable=True)
    team_name = Column(String(200), nullable=True)
    source = Column(String(50), nullable=True, default="bundesliga")  # "bundesliga" | "youtube"
    published = Column(Boolean, nullable=False, default=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
