# app/models/lineup.py

from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    ForeignKey,
    DateTime,
    func,
    JSON,
)
from sqlalchemy.orm import relationship
from app.core.database import Base


class Lineup(Base):
    __tablename__ = "lineups"

    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(
        Integer, ForeignKey("matches.id", ondelete="CASCADE"), nullable=False
    )
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)

    # Team-Level Daten
    formation = Column(String(20))  # "4-2-3-1"
    coach_id = Column(Integer)
    coach_name = Column(String(100))

    # Player-Level Daten
    player_id = Column(Integer)
    player_name = Column(String(100))
    number = Column(Integer)
    position = Column(String(5))  # G, D, M, F
    grid = Column(String(10))  # "1:1", "2:3", etc.
    is_substitute = Column(Boolean, default=False)  # FALSE = startXI

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    match = relationship("Match", backref="lineups")
    team = relationship("Team")

    def __repr__(self):
        return f"<Lineup(match={self.match_id}, player={self.player_name}, starter={not self.is_substitute})>"
