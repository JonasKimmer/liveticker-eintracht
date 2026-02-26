"""
Pydantic Schemas für Match.
"""

from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.schemas.team import Team
from app.schemas.league_season import LeagueSeasonSimple


class MatchBase(BaseModel):
    league_season_id: int
    home_team_id: int
    away_team_id: int
    match_date: datetime
    round: str | None = None
    status: str = "scheduled"


class MatchCreate(MatchBase):
    external_id: int | None = None
    score_home: int = 0
    score_away: int = 0


class MatchUpdate(BaseModel):
    league_season_id: int | None = None
    round: str | None = None
    match_date: datetime | None = None
    status: str | None = None
    score_home: int | None = None
    score_away: int | None = None


class Match(MatchBase):
    id: int
    external_id: int | None
    score_home: int | None = None  # Fix: None erlaubt für noch nicht gespielte Matches
    score_away: int | None = None  # Fix: None erlaubt für noch nicht gespielte Matches
    minute: int | None = None
    created_at: datetime
    updated_at: datetime | None

    home_team: Team
    away_team: Team
    league_season: LeagueSeasonSimple

    model_config = ConfigDict(from_attributes=True)


class MatchSimple(BaseModel):
    id: int
    league_season_id: int
    home_team_id: int
    away_team_id: int
    match_date: datetime
    round: str | None
    status: str
    score_home: int | None = None  # Fix: None erlaubt
    score_away: int | None = None  # Fix: None erlaubt
    minute: int | None = None

    model_config = ConfigDict(from_attributes=True)
