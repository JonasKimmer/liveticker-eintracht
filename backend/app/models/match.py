"""
SQLAlchemy Model für Matches mit League-Season-Beziehung.
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Match(Base):
    """Match-Model mit League-Season-Beziehung."""

    __tablename__ = "matches"

    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(Integer, unique=True, index=True, nullable=True)

    # Foreign Keys
    league_season_id = Column(Integer, ForeignKey("league_seasons.id"), nullable=False)
    home_team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    away_team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)

    # Match Details
    round = Column(String(100))
    match_date = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(20), default="scheduled")  # scheduled, live, finished
    score_home = Column(Integer, default=0)
    score_away = Column(Integer, default=0)
    minute = Column(Integer, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    league_season = relationship("LeagueSeason", back_populates="matches")
    home_team = relationship(
        "Team", foreign_keys=[home_team_id], backref="home_matches"
    )
    away_team = relationship(
        "Team", foreign_keys=[away_team_id], backref="away_matches"
    )
    # events wird via backref in Event.match erstellt!

    def __repr__(self):
        return f"<Match(id={self.id}, home={self.home_team_id} vs away={self.away_team_id})>"
