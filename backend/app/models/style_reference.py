from sqlalchemy import Column, Integer, String, Text, TIMESTAMP
from sqlalchemy.sql import func
from app.core.database import Base


class StyleReference(Base):
    __tablename__ = "style_references"

    id = Column(Integer, primary_key=True)
    match_day = Column(Integer, nullable=True)  # Spieltag (1–34)
    match_label = Column(String(100), nullable=True)  # z.B. "FCB vs SGE"
    league = Column(String(50), nullable=True)  # z.B. "bundesliga"
    event_type = Column(String(50), nullable=False)  # goal, yellow_card, comment, ...
    minute = Column(Integer, nullable=True)
    extra_time = Column(Integer, nullable=True)
    text = Column(Text, nullable=False)  # Original Eintracht-Tickertext
    instance = Column(
        String(20), nullable=False, default="ef_whitelabel"
    )  # ef_whitelabel | generic
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
