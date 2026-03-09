from sqlalchemy import Column, Integer, String, Boolean, Date, Float, Text, TIMESTAMP, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Player(Base):
    __tablename__ = "players"

    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(Integer, nullable=True, index=True, unique=True)  # API-Sports player ID
    sport = Column(String(20), nullable=False, default="Football")
    team_id = Column(Integer, ForeignKey("teams.id", ondelete="SET NULL"), nullable=True, index=True)
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    short_name = Column(String(100), nullable=True)
    display_name = Column(String(100), nullable=True)
    known_name = Column(String(100), nullable=True)
    position = Column(String(30), nullable=True)          # Midfielder | Goalkeeper | Defender | Forward
    birthday = Column(Date, nullable=True)
    birthplace = Column(String(100), nullable=True)
    weight = Column(Float, nullable=True)
    height = Column(Float, nullable=True)
    jersey_number = Column(Integer, nullable=True)
    country = Column(String(100), nullable=True)
    joined_on = Column(Date, nullable=True)
    signing_date = Column(Date, nullable=True)
    image_url = Column(String(500), nullable=True)
    person_hero_image_url = Column(String(500), nullable=True)
    profile = Column(Text, nullable=True)
    hidden = Column(Boolean, nullable=False, default=False)
    statistics = Column(JSONB, nullable=True)              # PlayerStatistics als JSON
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    team = relationship("Team", lazy="select")
