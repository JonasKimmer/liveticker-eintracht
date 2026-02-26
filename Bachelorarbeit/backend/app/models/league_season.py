from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base


class LeagueSeason(Base):
    __tablename__ = "league_seasons"

    id = Column(Integer, primary_key=True, index=True)
    league_id = Column(Integer, ForeignKey("leagues.id"), nullable=False)
    season_id = Column(Integer, ForeignKey("seasons.id"), nullable=False)
    current_round = Column(String(100))
    total_rounds = Column(Integer)
    rounds = Column(JSONB)  # neu

    __table_args__ = (
        UniqueConstraint("league_id", "season_id", name="unique_league_season"),
    )

    league = relationship("League", back_populates="league_seasons")
    season = relationship("Season", back_populates="league_seasons")
    matches = relationship(
        "Match", back_populates="league_season", cascade="all, delete-orphan"
    )
