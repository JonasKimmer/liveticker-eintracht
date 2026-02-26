# app/models/synthetic_event.py

from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base


class SyntheticEvent(Base):
    __tablename__ = "synthetic_events"

    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(
        Integer,
        ForeignKey("matches.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    event_type = Column(String(50), nullable=False)
    severity = Column(String(20), nullable=True)
    context_data = Column(JSONB, nullable=True)
    auto_generated = Column(Boolean, default=False)
    ticker_text = Column(String(500), nullable=True)
    ticker_style = Column(String(20), nullable=True)
    minute = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    match = relationship("Match", backref="synthetic_events")
    team = relationship("Team", foreign_keys=[team_id])

    def __repr__(self):
        return f"<SyntheticEvent(id={self.id}, type='{self.event_type}', match_id={self.match_id})>"
