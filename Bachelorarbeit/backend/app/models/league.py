"""
SQLAlchemy Model für Leagues (Ligen).
"""

from sqlalchemy import Column, Integer, String, DateTime, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class League(Base):
    """Liga-Model (Bundesliga, La Liga, etc.)."""

    __tablename__ = "leagues"

    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(Integer, unique=True, index=True, nullable=True)
    name = Column(String(100), nullable=False)
    country = Column(String(50))
    logo_url = Column(String(255))
    type = Column(String(50))  # 'League', 'Cup'
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    league_seasons = relationship(
        "LeagueSeason", back_populates="league", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<League(id={self.id}, name='{self.name}')>"
