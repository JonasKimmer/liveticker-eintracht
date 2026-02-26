from sqlalchemy import Column, Integer, String, Boolean, TIMESTAMP, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Lineup(Base):
    __tablename__ = "lineups"

    id = Column(Integer, primary_key=True)
    match_id = Column(
        Integer, ForeignKey("matches.id", ondelete="CASCADE"), nullable=False
    )
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    player_id = Column(Integer, nullable=True)
    player_name = Column(String(100), nullable=True)
    number = Column(Integer, nullable=True)
    position = Column(String(20), nullable=True)
    grid = Column(String(10), nullable=True)
    formation = Column(String(20), nullable=True)
    coach = Column(String(100), nullable=True)
    starter = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    match = relationship("Match", back_populates="lineups")
    team = relationship("Team")
