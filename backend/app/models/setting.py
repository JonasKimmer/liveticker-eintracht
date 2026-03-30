from sqlalchemy import Column, String, Text, TIMESTAMP
from sqlalchemy.sql import func
from app.core.database import Base


class Setting(Base):
    __tablename__ = "settings"

    key = Column(String(100), primary_key=True)
    value = Column(Text, nullable=False)
    updated_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
