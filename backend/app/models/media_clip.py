from sqlalchemy import Column, Integer, String, Text, Boolean, TIMESTAMP, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base


class MediaClip(Base):
    __tablename__ = "media_clips"

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
