import uuid

from sqlalchemy import Column, Integer, ForeignKey, UniqueConstraint, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class CompetitionTeam(Base):
    __tablename__ = "competition_teams"

    id = Column(Integer, primary_key=True, index=True)
    uid = Column(
        UUID(as_uuid=True), default=uuid.uuid4, nullable=False, unique=True, index=True
    )
    season_id = Column(
        Integer, ForeignKey("seasons.id", ondelete="CASCADE"), nullable=False
    )
    competition_id = Column(
        Integer, ForeignKey("competitions.id", ondelete="CASCADE"), nullable=False
    )
    team_id = Column(
        Integer, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False
    )
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    season = relationship("Season", back_populates="competition_teams")
    competition = relationship("Competition", back_populates="competition_teams")
    team = relationship("Team", back_populates="competition_teams")

    __table_args__ = (
        UniqueConstraint(
            "season_id", "competition_id", "team_id", name="uq_competition_team"
        ),
    )
