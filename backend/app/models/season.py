import uuid

from sqlalchemy import Column, Integer, String, Date, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Season(Base):
    __tablename__ = "seasons"

    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(Integer, nullable=True, unique=True, index=True)
    uid = Column(
        UUID(as_uuid=True), default=uuid.uuid4, nullable=False, unique=True, index=True
    )
    sport = Column(String(20), nullable=False, default="Football")
    title = Column(String(100), nullable=False, index=True)
    short_title = Column(String(20), nullable=True)
    starts_at = Column(Date, nullable=True)
    ends_at = Column(Date, nullable=True)
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

    matches = relationship("Match", back_populates="season", lazy="select")
    standings = relationship("Standing", back_populates="season", lazy="select")
    competition_teams = relationship(
        "CompetitionTeam", back_populates="season", lazy="select"
    )
