from sqlalchemy import Column, Integer, ForeignKey, UniqueConstraint, TIMESTAMP
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class CompetitionTeam(Base):
    __tablename__ = "competition_teams"

    id = Column(Integer, primary_key=True)
    season_id = Column(
        Integer, ForeignKey("seasons.id", ondelete="CASCADE"), nullable=False
    )
    competition_id = Column(
        Integer, ForeignKey("competitions.id", ondelete="CASCADE"), nullable=False
    )
    team_id = Column(
        Integer, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False
    )
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint(
            "season_id", "competition_id", "team_id", name="uq_competition_team"
        ),
    )

    season = relationship("Season")
    competition = relationship("Competition")
    team = relationship("Team")
