from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class MatchStatisticCreate(BaseModel):
    match_id: int
    team_id: int
    possession_percentage: Optional[str] = None  # "45.0"
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


class MatchStatisticUpdate(BaseModel):
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


class MatchStatistic(MatchStatisticCreate):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
