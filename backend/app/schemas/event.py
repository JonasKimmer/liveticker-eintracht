from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional
from enum import Enum


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


class EventCreate(BaseModel):
    match_id: int
    external_id: Optional[int] = None
    source_id: Optional[str] = None
    sport: Optional[str] = None
    position: Optional[int] = None
    time: Optional[int] = None
    time_additional: Optional[int] = None
    event_type: Optional[str] = None
    phase: Optional[str] = None
    description: Optional[str] = None
    html_description: Optional[str] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    source: str = "partner"


class EventUpdate(BaseModel):
    time: Optional[int] = None
    time_additional: Optional[int] = None
    event_type: Optional[str] = None
    phase: Optional[str] = None
    description: Optional[str] = None
    position: Optional[int] = None


class Event(BaseModel):
    id: int
    match_id: int
    external_id: Optional[int] = None
    source_id: Optional[str] = None
    sport: Optional[str] = None
    position: Optional[int] = None
    time: Optional[int] = None
    time_additional: Optional[int] = None
    event_type: Optional[str] = None
    phase: Optional[str] = None
    description: Optional[str] = None
    html_description: Optional[str] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    source: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
