from sqlalchemy import Column, Integer, String, Boolean, TIMESTAMP, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Match(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True)
    external_id = Column(Integer, nullable=True)
    uid = Column(UUID, nullable=True)
    sport = Column(String(20), nullable=False, default="Football")
    season_id = Column(
        Integer, ForeignKey("seasons.id", ondelete="SET NULL"), nullable=True
    )
    competition_id = Column(
        Integer, ForeignKey("competitions.id", ondelete="SET NULL"), nullable=True
    )
    home_team_id = Column(
        Integer, ForeignKey("teams.id", ondelete="SET NULL"), nullable=True
    )
    away_team_id = Column(
        Integer, ForeignKey("teams.id", ondelete="SET NULL"), nullable=True
    )
    home_score = Column(Integer, nullable=True)
    away_score = Column(Integer, nullable=True)
    matchday = Column(Integer, nullable=True)
    matchday_title = Column(JSONB, nullable=True)
    starts_at = Column(TIMESTAMP(timezone=True), nullable=True)
    ends_at = Column(TIMESTAMP(timezone=True), nullable=True)
    venue = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)
    match_state = Column(
        String(30), nullable=True
    )  # Undefined|PreMatch|Live|FullTime|Postponed|Cancelled
    match_phase = Column(
        String(30), nullable=True
    )  # Undefined|FirstHalf|SecondHalf|PostMatch
    is_scheduled = Column(Boolean, default=False)
    source = Column(String(20), nullable=False, default="partner")
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), nullable=True)

    season = relationship("Season", back_populates="matches")
    competition = relationship("Competition", back_populates="matches")
    home_team = relationship(
        "Team", foreign_keys=[home_team_id], back_populates="home_matches"
    )
    away_team = relationship(
        "Team", foreign_keys=[away_team_id], back_populates="away_matches"
    )
    events = relationship("Event", back_populates="match", cascade="all, delete-orphan")
    ticker_entries = relationship(
        "TickerEntry", back_populates="match", cascade="all, delete-orphan"
    )
    lineups = relationship(
        "Lineup", back_populates="match", cascade="all, delete-orphan"
    )
    match_statistics = relationship(
        "MatchStatistic", back_populates="match", cascade="all, delete-orphan"
    )
    player_statistics = relationship(
        "PlayerStatistic", back_populates="match", cascade="all, delete-orphan"
    )
    synthetic_events = relationship(
        "SyntheticEvent", back_populates="match", cascade="all, delete-orphan"
    )
    standings = relationship("Standing", back_populates="match")
