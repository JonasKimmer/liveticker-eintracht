from sqlalchemy import Column, Integer, String, Text, TIMESTAMP, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class TickerEntry(Base):
    __tablename__ = "ticker_entries"

    id = Column(Integer, primary_key=True)
    match_id = Column(
        Integer, ForeignKey("matches.id", ondelete="CASCADE"), nullable=False
    )
    event_id = Column(
        Integer, ForeignKey("events.id", ondelete="SET NULL"), nullable=True
    )
    text = Column(Text, nullable=False)
    style = Column(String(50), nullable=True)
    icon = Column(String(50), nullable=True)
    llm_model = Column(String(100), nullable=True)
    status = Column(
        String(20), nullable=False, default="draft"
    )  # draft|published|rejected
    source = Column(String(20), nullable=False, default="ai")  # ai|manual
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    match = relationship("Match", back_populates="ticker_entries")
    event = relationship("Event", back_populates="ticker_entries")
