from datetime import datetime
from enum import Enum
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator


# ------------------------------------------------------------------ #
# Enums                                                                #
# ------------------------------------------------------------------ #


class MatchState(str, Enum):
    undefined = "Undefined"
    to_be_confirmed = "ToBeConfirmed"
    pre_match = "PreMatch"
    live = "Live"
    interrupted = "Interrupted"
    full_time = "FullTime"
    postponed = "Postponed"
    cancelled = "Cancelled"


class MatchPhase(str, Enum):
    undefined = "Undefined"
    pre_match = "PreMatch"
    first_half = "FirstHalf"
    second_half = "SecondHalf"
    full_time = "FullTime"
    postponed = "PostPoned"


# ------------------------------------------------------------------ #
# Sub-schemas                                                          #
# ------------------------------------------------------------------ #


class LocalizedTitle(BaseModel):
    de: Optional[str] = Field(None, max_length=200)
    en: Optional[str] = Field(None, max_length=200)
    model_config = ConfigDict(extra="allow")


class JerseyInfo(BaseModel):
    image_url: Optional[HttpUrl] = Field(None, alias="imageUrl")
    flock_color: Optional[str] = Field(None, alias="flockColor", max_length=20)
    model_config = ConfigDict(populate_by_name=True)


# ------------------------------------------------------------------ #
# Create                                                               #
# ------------------------------------------------------------------ #


class MatchCreate(BaseModel):
    external_id: Optional[int] = Field(None, gt=0)
    sport: str = Field("Football", max_length=20)
    season_id: Optional[int] = Field(None, gt=0)
    competition_id: Optional[int] = Field(None, gt=0)
    home_team_id: Optional[int] = Field(None, gt=0)
    away_team_id: Optional[int] = Field(None, gt=0)
    home_score: Optional[int] = Field(None, ge=0)
    away_score: Optional[int] = Field(None, ge=0)
    matchday: Optional[int] = Field(None, ge=1)
    matchday_title: Optional[LocalizedTitle] = None
    title: Optional[str] = Field(None, max_length=200)
    localized_title: Optional[LocalizedTitle] = None
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    venue: Optional[str] = Field(None, max_length=100)
    city: Optional[str] = Field(None, max_length=100)
    match_state: Optional[MatchState] = None
    match_phase: Optional[MatchPhase] = None
    is_scheduled: bool = False
    is_kickoff_confirmed: bool = False
    number_of_goal_scorers: Optional[int] = Field(None, ge=0)
    number_of_viewers: Optional[int] = Field(None, ge=0)
    team_home_jersey: Optional[JerseyInfo] = None
    team_away_jersey: Optional[JerseyInfo] = None
    broadcasts: Optional[list[int]] = None
    source: str = Field("partner", max_length=20, exclude=True)

    @field_validator("away_team_id")
    @classmethod
    def teams_must_differ(cls, v: Optional[int], info: Any) -> Optional[int]:
        home = info.data.get("home_team_id")
        if v is not None and home is not None and v == home:
            raise ValueError("home_team_id and away_team_id must be different")
        return v


# ------------------------------------------------------------------ #
# Update                                                               #
# ------------------------------------------------------------------ #


class MatchUpdate(BaseModel):
    home_score: Optional[int] = Field(None, ge=0)
    away_score: Optional[int] = Field(None, ge=0)
    match_state: Optional[MatchState] = None
    match_phase: Optional[MatchPhase] = None
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    venue: Optional[str] = Field(None, max_length=100)
    city: Optional[str] = Field(None, max_length=100)
    is_scheduled: Optional[bool] = None
    is_kickoff_confirmed: Optional[bool] = None
    number_of_goal_scorers: Optional[int] = Field(None, ge=0)
    number_of_viewers: Optional[int] = Field(None, ge=0)
    team_home_jersey: Optional[JerseyInfo] = None
    team_away_jersey: Optional[JerseyInfo] = None
    broadcasts: Optional[list[int]] = None
    matchday_title: Optional[LocalizedTitle] = None
    localized_title: Optional[LocalizedTitle] = None


# ------------------------------------------------------------------ #
# Response                                                             #
# ------------------------------------------------------------------ #


class TeamInMatch(BaseModel):
    """Minimal team representation embedded in match response."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    uid: UUID
    name: str
    short_name: Optional[str] = None
    logo_url: Optional[str] = None


class MatchResponse(BaseModel):
    """Full match detail response."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    uid: UUID
    external_id: Optional[int] = None
    sport: str
    season_id: Optional[int] = None
    competition_id: Optional[int] = None
    home_team_id: Optional[int] = None
    away_team_id: Optional[int] = None
    home_team: Optional[TeamInMatch] = None
    away_team: Optional[TeamInMatch] = None
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    matchday: Optional[int] = None
    matchday_title: Optional[dict] = None
    title: Optional[str] = None
    localized_title: Optional[dict] = None
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    venue: Optional[str] = None
    city: Optional[str] = None
    match_state: Optional[str] = None
    match_phase: Optional[str] = None
    is_scheduled: bool
    is_kickoff_confirmed: bool
    number_of_goal_scorers: Optional[int] = None
    number_of_viewers: Optional[int] = None
    team_home_jersey: Optional[dict] = None
    team_away_jersey: Optional[dict] = None
    broadcasts: Optional[list] = None
    created_at: datetime
    updated_at: datetime


class MatchListResponse(BaseModel):
    """Slim response for list endpoints – no nested team objects."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    uid: UUID
    external_id: Optional[int] = None
    sport: str
    season_id: Optional[int] = None
    competition_id: Optional[int] = None
    home_team_id: Optional[int] = None
    away_team_id: Optional[int] = None
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    matchday: Optional[int] = None
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    match_state: Optional[str] = None
    match_phase: Optional[str] = None
    is_scheduled: bool
    is_kickoff_confirmed: bool
    updated_at: datetime


# ------------------------------------------------------------------ #
# Lineup sub-schemas                                                   #
# ------------------------------------------------------------------ #


class LineupPlayerStatus(str, Enum):
    start = "Start"
    sub = "Sub"


class LineupPlayerPosition(str, Enum):
    goalkeeper = "Goalkeeper"
    defender = "Defender"
    midfielder = "Midfielder"
    forward = "Forward"


class LineupPlayerInput(BaseModel):
    player_id: int = Field(..., gt=0)
    jersey_number: Optional[int] = Field(None, ge=1, le=99)
    status: LineupPlayerStatus
    formation_place: Optional[int] = Field(None, ge=0, le=99999)
    formation_position: Optional[int] = None
    position: Optional[LineupPlayerPosition] = None
    number_of_goals: int = Field(0, ge=0)
    has_yellow_card: bool = False
    has_red_card: bool = False
    is_substituted: bool = False
    formation: Optional[str] = Field(None, max_length=20)


class LineupBulkUpdate(BaseModel):
    """PUT /matches/{id}/lineup – replaces both team lineups at once."""

    team_home_lineup: list[LineupPlayerInput] = Field(..., min_length=1)
    team_away_lineup: list[LineupPlayerInput] = Field(..., min_length=1)


class LineupPlayerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    match_id: int
    team_id: int
    player_id: Optional[int] = None
    jersey_number: Optional[int] = None
    status: Optional[str] = None
    formation_place: Optional[int] = None
    formation_position: Optional[int] = None
    position: Optional[str] = None
    number_of_goals: int
    has_yellow_card: bool
    has_red_card: bool
    is_substituted: bool
    formation: Optional[str] = None


# ------------------------------------------------------------------ #
# Statistics sub-schemas                                               #
# ------------------------------------------------------------------ #


class TeamStatisticsInput(BaseModel):
    possession_percentage: Optional[str] = Field(None, max_length=10)
    total_pass: Optional[int] = Field(None, ge=0)
    accurate_pass: Optional[int] = Field(None, ge=0)
    duel_won: Optional[int] = Field(None, ge=0)
    duel_lost: Optional[int] = Field(None, ge=0)
    air_duel_won: Optional[int] = Field(None, ge=0)
    air_duel_lost: Optional[int] = Field(None, ge=0)
    blocked_pass: Optional[int] = Field(None, ge=0)
    total_offside: Optional[int] = Field(None, ge=0)
    corner_taken: Optional[int] = Field(None, ge=0)
    goal_scoring_attempt: Optional[int] = Field(None, ge=0)
    goal_on_target_scoring_attempt: Optional[int] = Field(None, ge=0)
    fouls: Optional[int] = Field(None, ge=0)
    yellow_cards: Optional[int] = Field(None, ge=0)
    crosses_in_match: Optional[int] = Field(None, ge=0)
    crosses_accurate: Optional[int] = Field(None, ge=0)
    total_crosses: Optional[int] = Field(None, ge=0)
    formation_used: Optional[str] = Field(None, max_length=20)


class StatisticsBulkUpdate(BaseModel):
    """PATCH /matches/{id}/statistics – updates both teams at once."""

    team_home_statistics: TeamStatisticsInput
    team_away_statistics: TeamStatisticsInput


class MatchStatisticResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    match_id: int
    team_id: int
    possession_percentage: Optional[str] = None
    total_pass: Optional[int] = None
    accurate_pass: Optional[int] = None
    duel_won: Optional[int] = None
    duel_lost: Optional[int] = None
    air_duel_won: Optional[int] = None
    air_duel_lost: Optional[int] = None
    blocked_pass: Optional[int] = None
    total_offside: Optional[int] = None
    corner_taken: Optional[int] = None
    goal_scoring_attempt: Optional[int] = None
    goal_on_target_scoring_attempt: Optional[int] = None
    fouls: Optional[int] = None
    yellow_cards: Optional[int] = None
    crosses_in_match: Optional[int] = None
    crosses_accurate: Optional[int] = None
    total_crosses: Optional[int] = None
    formation_used: Optional[str] = None
