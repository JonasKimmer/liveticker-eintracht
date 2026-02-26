"""
SQLAlchemy Model für Seasons (Saisons).
"""

from sqlalchemy import Column, Integer, Date, Boolean, DateTime, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Season(Base):
    """Saison-Model (2024/25, 2025/26, etc.)."""

    __tablename__ = "seasons"

    id = Column(Integer, primary_key=True, index=True)
    year = Column(Integer, nullable=False, unique=True)  # 2025
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    current = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    league_seasons = relationship(
        "LeagueSeason", back_populates="season", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Season(year={self.year})>"
