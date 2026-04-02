from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

from app.schemas.base import PaginatedResponse


class LiveTickerEventType(str, Enum):
    partner_goal = "PartnerGoal"
    partner_penalty_goal = "PartnerPenaltyGoal"
    partner_own_goal = "PartnerOwnGoal"
    partner_missed_penalty = "PartnerMissedPenalty"
    partner_yellow_card = "PartnerYellowCard"
    partner_red_card = "PartnerRedCard"
    partner_yellow_red_card = "PartnerYellowRedCard"
    partner_substitution = "PartnerSubstitution"
    partner_kick_off = "PartnerKickOff"
    partner_half_time = "PartnerHalfTime"
    partner_full_time = "PartnerFullTime"
    partner_extra_time_start = "PartnerExtraTimeStart"
    partner_extra_time_half_time = "PartnerExtraTimeHalfTime"
    partner_extra_time_end = "PartnerExtraTimeEnd"
    partner_penalty_shootout_start = "PartnerPenaltyShootoutStart"
    partner_penalty_shootout_end = "PartnerPenaltyShootoutEnd"


class LiveTickerPhaseType(str, Enum):
    first_half = "FirstHalf"
    second_half = "SecondHalf"
    extra_time_first_half = "ExtraTimeFirstHalf"
    extra_time_second_half = "ExtraTimeSecondHalf"
    penalty_shootout = "PenaltyShootout"
    pre_match = "PreMatch"
    post_match = "PostMatch"


class EventPlayerDto(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

    player_id: Optional[int] = None
    name: Optional[str] = None
    role: Optional[str] = None  # e.g. "Scorer", "Assist", "PlayerIn", "PlayerOut"


class EventCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

    source_id: Optional[str] = Field(
        None, max_length=100, description="Partner API key – used as upsert key"
    )
    sport: str = Field("Football", max_length=20)
    position: Optional[int] = Field(None, ge=0)
    time: Optional[int] = Field(None, ge=0)
    time_additional: Optional[int] = Field(None, ge=0)
    phase: Optional[str] = Field(None, max_length=50, alias="liveTickerPhaseType")
    event_type: Optional[str] = Field(None, max_length=50, alias="liveTickerEventType")
    description: Optional[str] = None
    html_description: Optional[str] = Field(None, alias="htmlDescription")
    image_url: Optional[str] = Field(None, max_length=500)
    video_url: Optional[str] = Field(None, max_length=500)
    players: Optional[list[EventPlayerDto]] = None


class EventUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

    position: Optional[int] = Field(None, ge=0)
    time: Optional[int] = Field(None, ge=0)
    time_additional: Optional[int] = Field(None, ge=0)
    phase: Optional[str] = Field(None, max_length=50, alias="liveTickerPhaseType")
    event_type: Optional[str] = Field(None, max_length=50, alias="liveTickerEventType")
    description: Optional[str] = None
    html_description: Optional[str] = Field(None, alias="htmlDescription")
    image_url: Optional[str] = Field(None, max_length=500)
    video_url: Optional[str] = Field(None, max_length=500)
    players: Optional[list[EventPlayerDto]] = None


class EventResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        alias_generator=to_camel,
    )

    id: int
    partner_id: Optional[int] = Field(None, validation_alias="external_id")
    source_id: Optional[str] = None
    match_id: int
    sport: Optional[str] = None
    position: Optional[int] = None
    time: Optional[int] = None
    time_additional: Optional[int] = None
    phase: Optional[str] = Field(None, serialization_alias="liveTickerPhaseType")
    event_type: Optional[str] = Field(None, serialization_alias="liveTickerEventType")
    description: Optional[str] = None
    html_description: Optional[str] = Field(None, serialization_alias="htmlDescription")
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    players: Optional[list[EventPlayerDto]] = None


class PaginatedEventResponse(PaginatedResponse[EventResponse]):
    pass
