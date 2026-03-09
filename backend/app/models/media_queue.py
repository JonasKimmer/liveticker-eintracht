from sqlalchemy import BigInteger, Column, Integer, Text, TIMESTAMP
from sqlalchemy.sql import func

from app.core.database import Base


class MediaQueue(Base):
    __tablename__ = "media_queue"

    id = Column(Integer, primary_key=True)
    media_id = Column(BigInteger, unique=True, nullable=False)
    name = Column(Text, nullable=True)
    thumbnail_url = Column(Text, nullable=True)
    compressed_url = Column(Text, nullable=True)
    original_url = Column(Text, nullable=True)
    event_id = Column(BigInteger, nullable=True)
    status = Column(Text, nullable=False, default="pending")  # pending | published
    description = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
