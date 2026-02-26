from sqlalchemy import Column, Integer, String, Date, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Season(Base):
    __tablename__ = "seasons"

    id = Column(Integer, primary_key=True)
    external_id = Column(Integer, nullable=True)
    uid = Column(UUID, nullable=True)
    sport = Column(String(20), nullable=False, default="Football")
    title = Column(String(100), nullable=False)
    short_title = Column(String(20), nullable=True)
    starts_at = Column(Date, nullable=True)
    ends_at = Column(Date, nullable=True)
    source = Column(String(20), nullable=False, default="partner")
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    matches = relationship("Match", back_populates="season")
    standings = relationship("Standing", back_populates="season")
