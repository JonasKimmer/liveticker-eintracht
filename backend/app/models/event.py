from sqlalchemy import Column, Integer, String, Text, TIMESTAMP, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True)
    external_id = Column(Integer, nullable=True)
    source_id = Column(String(100), nullable=True)
    match_id = Column(
        Integer, ForeignKey("matches.id", ondelete="CASCADE"), nullable=False
    )
    sport = Column(String(20), nullable=True)
    position = Column(Integer, nullable=True)
    time = Column(Integer, nullable=True)
    description = Column(Text, nullable=True)
    html_description = Column(Text, nullable=True)
    image_url = Column(String(255), nullable=True)
    video_url = Column(String(255), nullable=True)
    source = Column(String(20), nullable=False, default="partner")
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    match = relationship("Match", back_populates="events")
    ticker_entries = relationship("TickerEntry", back_populates="event")
