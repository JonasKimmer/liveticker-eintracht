# app/models/event.py
"""
SQLAlchemy Model für Events-Tabelle.
Speichert Spielereignisse (Tore, Karten, Wechsel, etc.).
"""

from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Event(Base):
    """Event Model - Spielereignisse während eines Matches."""

    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(
        Integer,
        ForeignKey("matches.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    minute = Column(Integer, nullable=False)
    extra_time = Column(Integer, nullable=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    player_id = Column(Integer, nullable=True)
    player_name = Column(String(100), nullable=True)
    assist_id = Column(Integer, nullable=True)
    assist_name = Column(String(100), nullable=True)
    type = Column(String(50), nullable=False)  # Goal, Card, subst
    detail = Column(String(100), nullable=True)  # Normal Goal, Yellow Card, etc.
    comments = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    match = relationship("Match", backref="events")
    team = relationship("Team", foreign_keys=[team_id])

    def __repr__(self):
        return f"<Event(id={self.id}, type='{self.type}', minute={self.minute})>"
