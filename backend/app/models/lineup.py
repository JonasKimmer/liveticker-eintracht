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
    team_id = Column(
        Integer, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False
    )
    player_id = Column(Integer, nullable=True)  # Partner-API playerId
    player_name = Column(String(200), nullable=True)
    jersey_number = Column(Integer, nullable=True)
    status = Column(String(10), nullable=True)  # Start | Sub
    formation_place = Column(Integer, nullable=True)
    formation_position = Column(Integer, nullable=True)
    position = Column(
        String(20), nullable=True
    )  # Goalkeeper|Defender|Midfielder|Forward
    number_of_goals = Column(Integer, default=0)
    has_yellow_card = Column(Boolean, default=False)
    has_red_card = Column(Boolean, default=False)
    is_substituted = Column(Boolean, default=False)
    formation = Column(String(20), nullable=True)  # z.B. "442"
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    match = relationship("Match", back_populates="lineups")
    team = relationship("Team")
