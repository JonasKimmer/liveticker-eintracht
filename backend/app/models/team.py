from sqlalchemy import Column, Integer, String, Boolean, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True)
    external_id = Column(Integer, nullable=True, unique=True)
    uid = Column(UUID, nullable=True)
    sport = Column(String(20), nullable=False, default="Football")
    name = Column(String(100), nullable=False)
    initials = Column(String(10), nullable=True)
    short_name = Column(String(100), nullable=True)
    logo_url = Column(String(255), nullable=True)
    is_partner_team = Column(Boolean, default=False)
    hidden = Column(Boolean, default=False)
    source = Column(String(20), nullable=False, default="partner")
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    home_matches = relationship(
        "Match", foreign_keys="Match.home_team_id", back_populates="home_team"
    )
    away_matches = relationship(
        "Match", foreign_keys="Match.away_team_id", back_populates="away_team"
    )
    favorites = relationship("UserFavorite", back_populates="team")
