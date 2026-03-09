from sqlalchemy import Column, Integer, String, Float, TIMESTAMP, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class PlayerStatistic(Base):
    __tablename__ = "player_statistics"

    id = Column(Integer, primary_key=True)
    match_id = Column(Integer, ForeignKey("matches.id", ondelete="CASCADE"), nullable=False)
    team_id = Column(Integer, ForeignKey("teams.id", ondelete="CASCADE"), nullable=True)
    player_id = Column(Integer, ForeignKey("players.id", ondelete="SET NULL"), nullable=True)

    position = Column(String(30), nullable=True)
    minutes = Column(Integer, nullable=True)
    rating = Column(Float, nullable=True)

    shots_total = Column(Integer, nullable=True)
    shots_on_target = Column(Integer, nullable=True)
    goals = Column(Integer, nullable=True, default=0)
    assists = Column(Integer, nullable=True, default=0)
    passes_total = Column(Integer, nullable=True)
    passes_key = Column(Integer, nullable=True)
    tackles_total = Column(Integer, nullable=True)
    dribbles_attempts = Column(Integer, nullable=True)
    dribbles_success = Column(Integer, nullable=True)
    fouls_drawn = Column(Integer, nullable=True)
    fouls_committed = Column(Integer, nullable=True)
    cards_yellow = Column(Integer, nullable=True, default=0)
    cards_red = Column(Integer, nullable=True, default=0)

    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("match_id", "player_id", name="uq_player_statistic"),
    )

    match = relationship("Match")
    team = relationship("Team")
    player = relationship("Player")
