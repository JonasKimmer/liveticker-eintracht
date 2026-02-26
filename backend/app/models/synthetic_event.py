from sqlalchemy import Column, Integer, String, TIMESTAMP, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class SyntheticEvent(Base):
    __tablename__ = "synthetic_events"

    id = Column(Integer, primary_key=True)
    match_id = Column(
        Integer, ForeignKey("matches.id", ondelete="CASCADE"), nullable=False
    )
    type = Column(String(50), nullable=True)
    minute = Column(Integer, nullable=True)
    data = Column(JSONB, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    match = relationship("Match", back_populates="synthetic_events")
