# app/models/match_statistic.py

from sqlalchemy import Column, Integer, ForeignKey, DateTime, func, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base


class MatchStatistic(Base):
    """Match Statistics Model - Team-Statistiken pro Match."""

    __tablename__ = "match_statistics"

    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(
        Integer, ForeignKey("matches.id", ondelete="CASCADE"), nullable=False
    )
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)

    # Schüsse
    shots_on_goal = Column(Integer)
    shots_off_goal = Column(Integer)
    total_shots = Column(Integer)
    blocked_shots = Column(Integer)
    shots_insidebox = Column(Integer)  # ← KORRIGIERT
    shots_outsidebox = Column(Integer)  # ← KORRIGIERT

    # Spielfluss
    fouls = Column(Integer)
    corner_kicks = Column(Integer)
    offsides = Column(Integer)
    ball_possession = Column(Integer)

    # Karten
    yellow_cards = Column(Integer)
    red_cards = Column(Integer)

    # Pässe
    goalkeeper_saves = Column(Integer)
    total_passes = Column(Integer)
    passes_accurate = Column(Integer)
    passes_percentage = Column(Integer)  # ← KORRIGIERT

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())  # ← NEU

    # Relationships
    match = relationship("Match", backref="statistics")
    team = relationship("Team")

    __table_args__ = (
        UniqueConstraint("match_id", "team_id", name="unique_match_team_stat"),
    )

    def __repr__(self):
        return f"<MatchStatistic(match_id={self.match_id}, team_id={self.team_id})>"
