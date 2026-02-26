from sqlalchemy import Column, Integer, String, Boolean, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Competition(Base):
    __tablename__ = "competitions"

    id = Column(Integer, primary_key=True)
    external_id = Column(Integer, nullable=True)
    uid = Column(UUID, nullable=True)
    sport = Column(String(20), nullable=False, default="Football")
    title = Column(String(100), nullable=True)
    short_title = Column(String(20), nullable=True)
    logo_url = Column(String(255), nullable=True)
    matchcenter_image_url = Column(String(255), nullable=True)
    has_standings_per_matchday = Column(Boolean, default=False)
    hidden = Column(Boolean, default=False)
    position = Column(Integer, default=1)
    source = Column(String(20), nullable=False, default="partner")
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    matches = relationship("Match", back_populates="competition")
    standings = relationship("Standing", back_populates="competition")
