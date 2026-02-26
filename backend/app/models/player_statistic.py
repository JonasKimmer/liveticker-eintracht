# app/models/player_statistic.py

from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DECIMAL,
    ForeignKey,
    DateTime,
    func,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from app.core.database import Base


class PlayerStatistic(Base):
    """Player Statistics Model - Spieler-Statistiken pro Match."""

    __tablename__ = "player_statistics"

    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(
        Integer,
        ForeignKey("matches.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    player_id = Column(Integer, index=True)
    player_name = Column(String(100))
    player_photo = Column(String(255))

    # Game Info
    minutes_played = Column(Integer)  # ← GEÄNDERT
    number = Column(Integer)
    position = Column(String(10))
    rating = Column(DECIMAL(3, 1))
    captain = Column(Boolean, default=False)
    substitute = Column(Boolean, default=False)

    # Offsides
    offsides = Column(Integer)  # ← NEU

    # Shots
    shots_total = Column(Integer)
    shots_on = Column(Integer)

    # Goals
    goals_total = Column(Integer)
    goals_conceded = Column(Integer)
    goals_assists = Column(Integer)  # ← GEÄNDERT (war "assists")
    goals_saves = Column(Integer)  # ← GEÄNDERT (war "saves")

    # Passes
    passes_total = Column(Integer)
    passes_key = Column(Integer)
    passes_accuracy = Column(Integer)

    # Tackles
    tackles_total = Column(Integer)
    tackles_blocks = Column(Integer)
    tackles_interceptions = Column(Integer)

    # Duels
    duels_total = Column(Integer)
    duels_won = Column(Integer)

    # Dribbles
    dribbles_attempts = Column(Integer)
    dribbles_success = Column(Integer)
    dribbles_past = Column(Integer)

    # Fouls
    fouls_drawn = Column(Integer)
    fouls_committed = Column(Integer)

    # Cards
    cards_yellow = Column(Integer)
    cards_red = Column(Integer)

    # Penalties
    penalty_won = Column(Integer)
    penalty_committed = Column(Integer)
    penalty_scored = Column(Integer)
    penalty_missed = Column(Integer)
    penalty_saved = Column(Integer)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())  # ← NEU

    # Relationships
    match = relationship("Match", backref="player_statistics")
    team = relationship("Team")

    __table_args__ = (
        UniqueConstraint("match_id", "player_id", name="unique_match_player"),
    )

    def __repr__(self):
        return f"<PlayerStatistic(match_id={self.match_id}, player={self.player_name})>"
