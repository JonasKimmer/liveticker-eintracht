from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

from app.schemas.base import PaginatedResponse


# ------------------------------------------------------------------ #
# Statistics                                                           #
# ------------------------------------------------------------------ #


class PlayerStatistics(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

    games_played: Optional[int] = None
    starts: Optional[int] = None
    time_played: Optional[int] = None
    duels_lost: Optional[int] = None
    duels_won: Optional[int] = None
    goals: Optional[int] = None
    goal_assists: Optional[int] = None
    penalty_goals: Optional[int] = None
    right_foot_goals: Optional[int] = None
    left_foot_goals: Optional[int] = None
    goals_from_inside_box: Optional[int] = None
    goals_from_outside_box: Optional[int] = None
    headed_goals: Optional[int] = None
    total_passes: Optional[int] = None
    successful_long_passes: Optional[int] = None
    successful_short_passes: Optional[int] = None
    touches: Optional[int] = None
    substitute_on: Optional[int] = None
    substitute_off: Optional[int] = None
    yellow_cards: Optional[int] = None
    yellow_red_cards: Optional[int] = None
    red_cards: Optional[int] = None
    successful_passes_own_half: Optional[int] = None
    successful_passes_opposition_half: Optional[int] = None
    sport: Optional[str] = None
    matches_played: Optional[int] = None


# ------------------------------------------------------------------ #
# Create / Update                                                      #
# ------------------------------------------------------------------ #


class PlayerCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

    id: Optional[int] = None
    sport: str = "Football"
    team_id: Optional[int] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    short_name: Optional[str] = None
    display_name: Optional[str] = None
    known_name: Optional[str] = None
    position: Optional[str] = None
    birthday: Optional[date] = None
    birthplace: Optional[str] = None
    weight: Optional[float] = None
    height: Optional[float] = None
    jersey_number: Optional[int] = None
    country: Optional[str] = None
    joined_on: Optional[date] = None
    signing_date: Optional[date] = None
    image_url: Optional[str] = None
    person_hero_image_url: Optional[str] = None
    profile: Optional[str] = None
    hidden: bool = False
    statistics: Optional[PlayerStatistics] = None


class PlayerUpdate(PlayerCreate):
    pass


class PlayerStatisticsUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

    statistics: PlayerStatistics


# ------------------------------------------------------------------ #
# Response                                                             #
# ------------------------------------------------------------------ #


class PlayerResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        alias_generator=to_camel,
    )

    id: int
    external_id: Optional[int] = None
    sport: str
    team_id: Optional[int] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    short_name: Optional[str] = None
    display_name: Optional[str] = None
    known_name: Optional[str] = None
    position: Optional[str] = None
    birthday: Optional[date] = None
    birthplace: Optional[str] = None
    weight: Optional[float] = None
    height: Optional[float] = None
    jersey_number: Optional[int] = None
    country: Optional[str] = None
    joined_on: Optional[date] = None
    signing_date: Optional[date] = None
    image_url: Optional[str] = None
    person_hero_image_url: Optional[str] = None
    profile: Optional[str] = None
    hidden: bool
    statistics: Optional[dict] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class PlayerStatisticResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        alias_generator=to_camel,
    )

    id: int
    match_id: int
    team_id: Optional[int] = None
    player_id: Optional[int] = None
    position: Optional[str] = None
    minutes: Optional[int] = None
    rating: Optional[float] = None
    shots_total: Optional[int] = None
    shots_on_target: Optional[int] = None
    goals: Optional[int] = None
    assists: Optional[int] = None
    passes_total: Optional[int] = None
    passes_key: Optional[int] = None
    tackles_total: Optional[int] = None
    dribbles_attempts: Optional[int] = None
    dribbles_success: Optional[int] = None
    fouls_drawn: Optional[int] = None
    fouls_committed: Optional[int] = None
    cards_yellow: Optional[int] = None
    cards_red: Optional[int] = None


class PaginatedPlayerResponse(PaginatedResponse[PlayerResponse]):
    pass
