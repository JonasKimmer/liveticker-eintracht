from sqlalchemy import Column, Integer, String, NUMERIC, TIMESTAMP, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class MatchStatistic(Base):
    __tablename__ = "match_statistics"

    id = Column(Integer, primary_key=True)
    match_id = Column(
        Integer, ForeignKey("matches.id", ondelete="CASCADE"), nullable=False
    )
    team_id = Column(
        Integer, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False
    )
    possession_percentage = Column(NUMERIC(5, 1), nullable=True)
    total_pass = Column(Integer, nullable=True)
    accurate_pass = Column(Integer, nullable=True)
    duel_won = Column(Integer, nullable=True)
    duel_lost = Column(Integer, nullable=True)
    air_duel_won = Column(Integer, nullable=True)
    air_duel_lost = Column(Integer, nullable=True)
    blocked_pass = Column(Integer, nullable=True)
    total_offside = Column(Integer, nullable=True)
    corner_taken = Column(Integer, nullable=True)
    goal_scoring_attempt = Column(Integer, nullable=True)
    goal_on_target_scoring_attempt = Column(Integer, nullable=True)
    fouls = Column(Integer, nullable=True)
    yellow_cards = Column(Integer, nullable=True)
    crosses_in_match = Column(Integer, nullable=True)
    crosses_accurate = Column(Integer, nullable=True)
    total_crosses = Column(Integer, nullable=True)
    formation_used = Column(String(20), nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("match_id", "team_id", name="uq_match_statistic"),
    )

    match = relationship("Match", back_populates="match_statistics")
    team = relationship("Team")
