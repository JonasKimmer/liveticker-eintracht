import uuid

from sqlalchemy import Column, Integer, String, Boolean, TIMESTAMP, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(Integer, nullable=True, unique=True, index=True)
    uid = Column(
        UUID(as_uuid=True), default=uuid.uuid4, nullable=False, unique=True, index=True
    )
    sport = Column(String(20), nullable=False, default="Football")
    name = Column(String(100), nullable=False, index=True)
    initials = Column(String(10), nullable=True)
    short_name = Column(String(100), nullable=True)
    category = Column(JSONB, nullable=True)
    logo_url = Column(String(500), nullable=True)
    is_partner_team = Column(Boolean, nullable=False, default=False)
    position = Column(Integer, nullable=False, default=0)
    hidden = Column(Boolean, nullable=False, default=False)
    source = Column(String(20), nullable=False, default="partner")
    country_id = Column(
        Integer, ForeignKey("countries.id", ondelete="SET NULL"), nullable=True
    )
    created_at = Column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    country = relationship("Country", back_populates="teams", lazy="select")
    home_matches = relationship(
        "Match",
        foreign_keys="Match.home_team_id",
        back_populates="home_team",
        lazy="select",
    )
    away_matches = relationship(
        "Match",
        foreign_keys="Match.away_team_id",
        back_populates="away_team",
        lazy="select",
    )
    favorites = relationship("UserFavorite", back_populates="team", lazy="select")
    competition_teams = relationship(
        "CompetitionTeam", back_populates="team", lazy="select"
    )