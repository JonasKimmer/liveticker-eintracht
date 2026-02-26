from sqlalchemy import (
    Column,
    Integer,
    String,
    Numeric,
    TIMESTAMP,
    ForeignKey,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class PlayerStatistic(Base):
    __tablename__ = "player_statistics"
    __table_args__ = (
        UniqueConstraint("match_id", "player_id", name="unique_match_player"),
    )

    id = Column(Integer, primary_key=True)
    match_id = Column(
        Integer, ForeignKey("matches.id", ondelete="CASCADE"), nullable=False
    )
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    player_id = Column(Integer, nullable=True)
    player_name = Column(String(100), nullable=True)
    minutes = Column(Integer, nullable=True)
    position = Column(String(10), nullable=True)
    rating = Column(Numeric(3, 1), nullable=True)
    goals_total = Column(Integer, nullable=True)
    assists = Column(Integer, nullable=True)
    cards_yellow = Column(Integer, nullable=True)
    cards_red = Column(Integer, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    match = relationship("Match", back_populates="player_statistics")
    team = relationship("Team")
