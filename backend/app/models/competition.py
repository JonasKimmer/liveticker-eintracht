import uuid

from sqlalchemy import Column, Integer, String, Boolean, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Competition(Base):
    __tablename__ = "competitions"

    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(Integer, nullable=True, unique=True, index=True)
    uid = Column(
        UUID(as_uuid=True), default=uuid.uuid4, nullable=False, unique=True, index=True
    )
    sport = Column(String(20), nullable=False, default="Football")
    title = Column(String(100), nullable=True)
    localized_title = Column(JSONB, nullable=True)
    short_title = Column(String(20), nullable=True)
    logo_url = Column(String(500), nullable=True)
    matchcenter_image_url = Column(String(500), nullable=True)
    has_standings_per_matchday = Column(Boolean, nullable=False, default=False)
    hidden = Column(Boolean, nullable=False, default=False)
    position = Column(Integer, nullable=False, default=1)
    source = Column(String(20), nullable=False, default="partner")
    created_at = Column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    matches = relationship("Match", back_populates="competition", lazy="select")
    standings = relationship("Standing", back_populates="competition", lazy="select")
    competition_teams = relationship(
        "CompetitionTeam", back_populates="competition", lazy="select"
    )
