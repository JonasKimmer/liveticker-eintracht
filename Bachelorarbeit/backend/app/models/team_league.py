# ----------------------------------------
# app/models/team_league.py
# ----------------------------------------
from sqlalchemy import Column, Integer, ForeignKey, PrimaryKeyConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base


class TeamLeague(Base):
    __tablename__ = "team_leagues"

    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    league_id = Column(Integer, ForeignKey("leagues.id"), nullable=False)
    season_year = Column(Integer, nullable=False)

    __table_args__ = (PrimaryKeyConstraint("team_id", "league_id", "season_year"),)

    team = relationship("Team", backref="team_leagues")
    league = relationship("League", backref="team_leagues")
