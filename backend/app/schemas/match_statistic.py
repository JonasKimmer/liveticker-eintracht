# app/schemas/match_statistic.py

from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class MatchStatisticBase(BaseModel):
    match_id: int
    team_id: int
    shots_on_goal: Optional[int] = None
    shots_off_goal: Optional[int] = None
    total_shots: Optional[int] = None
    blocked_shots: Optional[int] = None
    shots_insidebox: Optional[int] = None
    shots_outsidebox: Optional[int] = None
    fouls: Optional[int] = None
    corner_kicks: Optional[int] = None
    offsides: Optional[int] = None
    ball_possession: Optional[int] = None
    yellow_cards: Optional[int] = None
    red_cards: Optional[int] = None
    goalkeeper_saves: Optional[int] = None
    total_passes: Optional[int] = None
    passes_accurate: Optional[int] = None
    passes_percentage: Optional[int] = None


class MatchStatisticCreate(MatchStatisticBase):
    pass


class MatchStatisticUpdate(BaseModel):
    shots_on_goal: Optional[int] = None
    shots_off_goal: Optional[int] = None
    total_shots: Optional[int] = None
    blocked_shots: Optional[int] = None
    shots_insidebox: Optional[int] = None
    shots_outsidebox: Optional[int] = None
    fouls: Optional[int] = None
    corner_kicks: Optional[int] = None
    offsides: Optional[int] = None
    ball_possession: Optional[int] = None
    yellow_cards: Optional[int] = None
    red_cards: Optional[int] = None
    goalkeeper_saves: Optional[int] = None
    total_passes: Optional[int] = None
    passes_accurate: Optional[int] = None
    passes_percentage: Optional[int] = None


class MatchStatisticResponse(MatchStatisticBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None  # ← GEÄNDERT: Optional!

    model_config = ConfigDict(from_attributes=True)
