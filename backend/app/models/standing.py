from sqlalchemy import Column, Integer, TIMESTAMP, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Standing(Base):
    __tablename__ = "standings"

    id = Column(Integer, primary_key=True)
    season_id = Column(
        Integer, ForeignKey("seasons.id", ondelete="CASCADE"), nullable=False
    )
    competition_id = Column(
        Integer, ForeignKey("competitions.id", ondelete="CASCADE"), nullable=False
    )
    match_id = Column(
        Integer, ForeignKey("matches.id", ondelete="SET NULL"), nullable=True
    )
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    matchday = Column(Integer, nullable=True)
    position = Column(Integer, nullable=True)
    played = Column(Integer, nullable=True)
    won = Column(Integer, nullable=True)
    drawn = Column(Integer, nullable=True)
    lost = Column(Integer, nullable=True)
    goals_for = Column(Integer, nullable=True)
    goals_against = Column(Integer, nullable=True)
    points = Column(Integer, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    season = relationship("Season", back_populates="standings")
    competition = relationship("Competition", back_populates="standings")
    team = relationship("Team")
    match = relationship("Match", back_populates="standings")
