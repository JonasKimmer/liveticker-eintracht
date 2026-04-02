from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel

from app.schemas.base import PaginatedResponse


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


class JerseyInfo(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

    image_url: Optional[str] = Field(None, max_length=500)
    flock_color: Optional[str] = Field(None, max_length=20)


# ------------------------------------------------------------------ #
# Create                                                               #
# ------------------------------------------------------------------ #


class MatchCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

    id: Optional[int] = Field(None, gt=0)
    sport: str = Field("Football", max_length=20)
    season_id: Optional[int] = Field(None, gt=0)
    competition_id: Optional[int] = Field(None, gt=0)
    home_team_id: Optional[int] = Field(None, gt=0, alias="teamHomeId")
    away_team_id: Optional[int] = Field(None, gt=0, alias="teamAwayId")
    home_score: Optional[int] = Field(None, ge=0, alias="teamHomeScore")
    away_score: Optional[int] = Field(None, ge=0, alias="teamAwayScore")
    matchday: Optional[int] = Field(None, ge=1)
    matchday_title: Optional[LocalizedTitle] = None
    title: Optional[str] = Field(None, max_length=200)
    localized_title: Optional[LocalizedTitle] = None
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    kickoff: Optional[datetime] = None
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

    @field_validator("away_team_id")
    @classmethod
    def teams_must_differ(cls, v: Optional[int], info: Any) -> Optional[int]:
        home = info.data.get("home_team_id")
        if v is not None and home is not None and v == home:
            raise ValueError("teamHomeId and teamAwayId must be different")
        return v


# ------------------------------------------------------------------ #
# Update                                                               #
# ------------------------------------------------------------------ #


class MatchUpdate(BaseModel):    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

    home_score: Optional[int] = Field(None, ge=0, alias="teamHomeScore")
    away_score: Optional[int] = Field(None, ge=0, alias="teamAwayScore")
    match_state: Optional[MatchState] = Field(None, alias="state")
    match_phase: Optional[MatchPhase] = None
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    kickoff: Optional[datetime] = None
    venue: Optional[str] = Field(None, max_length=100)
    city: Optional[str] = Field(None, max_length=100)
    is_scheduled: Optional[bool] = None
    is_kickoff_confirmed: Optional[bool] = None
    minute: Optional[int] = Field(None, ge=0, le=120)
    number_of_goal_scorers: Optional[int] = Field(None, ge=0)
    number_of_viewers: Optional[int] = Field(None, ge=0)
    team_home_jersey: Optional[JerseyInfo] = None
    team_away_jersey: Optional[JerseyInfo] = None
    broadcasts: Optional[list[int]] = None
    matchday_title: Optional[LocalizedTitle] = None
    localized_title: Optional[LocalizedTitle] = None
    ticker_mode: Optional[str] = Field(None, pattern="^(auto|coop|manual)$")


class TickerModeUpdate(BaseModel):
    mode: str = Field(..., pattern="^(auto|coop|manual)$")


# ------------------------------------------------------------------ #
# Response                                                             #
# ------------------------------------------------------------------ #


class MatchTeamInfo(BaseModel):
    model_config = ConfigDict(
        from_attributes=True, populate_by_name=True, alias_generator=to_camel
    )

    id: int
    name: str
    logo_url: Optional[str] = None


class MatchResponse(BaseModel):
    """Full match response – matches Partner API structure."""

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        alias_generator=to_camel,
    )

    kickoff: Optional[datetime] = None
    is_kickoff_confirmed: bool
    localized_title: Optional[LocalizedTitle] = None
    match_phase: Optional[str] = None
    title: Optional[str] = None
    id: int
    external_id: Optional[int] = None
    uid: UUID = Field(serialization_alias="uId")
    sport: str
    created: Optional[date] = Field(None, validation_alias="created_at")
    updated: Optional[date] = Field(None, validation_alias="updated_at")
    starts_at: Optional[datetime] = None
    is_scheduled: bool
    season_id: Optional[int] = None
    competition_id: Optional[int] = None
    home_team_id: Optional[int] = Field(None, serialization_alias="teamHomeId")
    away_team_id: Optional[int] = Field(None, serialization_alias="teamAwayId")
    home_score: Optional[int] = Field(None, serialization_alias="teamHomeScore")
    away_score: Optional[int] = Field(None, serialization_alias="teamAwayScore")
    matchday: Optional[int] = None
    venue: Optional[str] = None
    city: Optional[str] = None
    matchday_title: Optional[LocalizedTitle] = None
    number_of_goal_scorers: Optional[int] = None
    team_home_jersey: Optional[JerseyInfo] = None
    team_away_jersey: Optional[JerseyInfo] = None
    broadcasts: Optional[list] = None
    number_of_viewers: Optional[int] = None
    match_state: Optional[str] = None
    minute: Optional[int] = None
    ends_at: Optional[datetime] = None
    ticker_mode: str = "coop"
    home_team: Optional[MatchTeamInfo] = None
    away_team: Optional[MatchTeamInfo] = None

    @field_validator("created", "updated", mode="before")
    @classmethod
    def datetime_to_date(cls, v: Any) -> Optional[date]:
        if isinstance(v, datetime):
            return v.date()
        return v


class PaginatedMatchResponse(PaginatedResponse[MatchResponse]):
    pass


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
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

    player_id: int = Field(..., gt=0)
    player_name: Optional[str] = None
    jersey_number: Optional[int] = Field(None, ge=1, le=99)
    shirt_number: Optional[int] = Field(None, ge=1, le=99)
    status: LineupPlayerStatus
    role: Optional[str] = Field(None, max_length=50)
    formation_place: Optional[int] = Field(None, ge=0, le=99999)
    formation_position: Optional[int] = None
    position: Optional[LineupPlayerPosition] = None
    number_of_goals: int = Field(0, ge=0)
    has_yellow_card: bool = False
    has_red_card: bool = False
    is_substituted: bool = False
    formation: Optional[str] = Field(None, max_length=20)


class LineupBulkUpdate(BaseModel):
    """PUT /matches/{matchId}/lineup – replaces both team lineups at once."""

    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

    team_home_lineup: list[LineupPlayerInput] = Field(..., min_length=1)
    team_away_lineup: list[LineupPlayerInput] = Field(..., min_length=1)


class LineupPlayerResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        alias_generator=to_camel,
    )

    id: int
    match_id: int
    team_id: int
    player_id: Optional[int] = None
    player_name: Optional[str] = None
    jersey_number: Optional[int] = None
    status: Optional[str] = None
    formation_place: Optional[int] = None
    formation_position: Optional[int] = None
    position: Optional[str] = None
    number_of_goals: int = 0
    has_yellow_card: bool = False
    has_red_card: bool = False
    is_substituted: bool = False
    formation: Optional[str] = None


# ------------------------------------------------------------------ #
# Statistics sub-schemas                                               #
# ------------------------------------------------------------------ #


class TeamStatisticsInput(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

    possession_percentage: Optional[Decimal] = Field(None, ge=0, le=100)
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
    """PATCH /matches/{matchId}/statistics – updates both teams at once."""

    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

    team_home_statistics: TeamStatisticsInput
    team_away_statistics: TeamStatisticsInput


class MatchStatisticResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        alias_generator=to_camel,
    )

    id: int
    match_id: int
    team_id: int
    possession_percentage: Optional[Decimal] = None
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
