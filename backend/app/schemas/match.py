from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class MatchCreate(BaseModel):
    external_id: Optional[int] = None
    sport: str = "Football"
    season_id: Optional[int] = None
    competition_id: Optional[int] = None
    home_team_id: Optional[int] = None
    away_team_id: Optional[int] = None
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    matchday: Optional[int] = None
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    venue: Optional[str] = None
    city: Optional[str] = None
    match_state: Optional[str] = None
    match_phase: Optional[str] = None
    is_scheduled: bool = False
    source: str = "partner"


class MatchUpdate(BaseModel):
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    match_state: Optional[str] = None
    match_phase: Optional[str] = None
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    venue: Optional[str] = None
    city: Optional[str] = None
    is_scheduled: Optional[bool] = None


class MatchSimple(BaseModel):
    id: int
    external_id: Optional[int]
    sport: str
    season_id: Optional[int]
    competition_id: Optional[int]
    home_team_id: Optional[int]
    away_team_id: Optional[int]
    home_score: Optional[int]
    away_score: Optional[int]
    matchday: Optional[int]
    starts_at: Optional[datetime]
    match_state: Optional[str]
    match_phase: Optional[str]
    source: str

    model_config = ConfigDict(from_attributes=True)


class Match(MatchSimple):
    ends_at: Optional[datetime]
    venue: Optional[str]
    city: Optional[str]
    is_scheduled: bool
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)
