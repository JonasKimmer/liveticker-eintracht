from sqlalchemy import Column, Integer, TIMESTAMP, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class MatchStatistic(Base):
    __tablename__ = "match_statistics"
    __table_args__ = (
        UniqueConstraint("match_id", "team_id", name="unique_match_team_stat"),
    )

    id = Column(Integer, primary_key=True)
    match_id = Column(
        Integer, ForeignKey("matches.id", ondelete="CASCADE"), nullable=False
    )
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    shots_on_goal = Column(Integer, nullable=True)
    shots_off_goal = Column(Integer, nullable=True)
    total_shots = Column(Integer, nullable=True)
    blocked_shots = Column(Integer, nullable=True)
    fouls = Column(Integer, nullable=True)
    corner_kicks = Column(Integer, nullable=True)
    offsides = Column(Integer, nullable=True)
    ball_possession = Column(Integer, nullable=True)
    yellow_cards = Column(Integer, nullable=True)
    red_cards = Column(Integer, nullable=True)
    goalkeeper_saves = Column(Integer, nullable=True)
    total_passes = Column(Integer, nullable=True)
    passes_accurate = Column(Integer, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    match = relationship("Match", back_populates="match_statistics")
    team = relationship("Team")
