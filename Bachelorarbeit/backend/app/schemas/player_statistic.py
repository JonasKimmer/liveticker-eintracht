# app/schemas/player_statistic.py

from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class PlayerStatisticBase(BaseModel):
    match_id: int
    player_id: int
    team_id: int
    player_name: str
    minutes_played: Optional[int] = None
    number: Optional[int] = None  # ← NEU
    position: Optional[str] = None  # ← NEU
    rating: Optional[float] = None
    captain: bool = False
    substitute: bool = False
    offsides: Optional[int] = None
    shots_total: Optional[int] = None
    shots_on: Optional[int] = None
    goals_total: Optional[int] = None
    goals_conceded: Optional[int] = None
    goals_assists: Optional[int] = None
    goals_saves: Optional[int] = None
    passes_total: Optional[int] = None
    passes_key: Optional[int] = None
    passes_accuracy: Optional[int] = None
    tackles_total: Optional[int] = None
    tackles_blocks: Optional[int] = None
    tackles_interceptions: Optional[int] = None
    duels_total: Optional[int] = None
    duels_won: Optional[int] = None
    dribbles_attempts: Optional[int] = None
    dribbles_success: Optional[int] = None
    dribbles_past: Optional[int] = None
    fouls_drawn: Optional[int] = None
    fouls_committed: Optional[int] = None
    cards_yellow: Optional[int] = None
    cards_red: Optional[int] = None
    penalty_won: Optional[int] = None
    penalty_committed: Optional[int] = None
    penalty_scored: Optional[int] = None
    penalty_missed: Optional[int] = None
    penalty_saved: Optional[int] = None


class PlayerStatisticCreate(PlayerStatisticBase):
    pass


class PlayerStatisticUpdate(BaseModel):
    minutes_played: Optional[int] = None
    number: Optional[int] = None
    position: Optional[str] = None
    rating: Optional[float] = None
    captain: Optional[bool] = None
    substitute: Optional[bool] = None
    offsides: Optional[int] = None
    shots_total: Optional[int] = None
    shots_on: Optional[int] = None
    goals_total: Optional[int] = None
    goals_conceded: Optional[int] = None
    goals_assists: Optional[int] = None
    goals_saves: Optional[int] = None
    passes_total: Optional[int] = None
    passes_key: Optional[int] = None
    passes_accuracy: Optional[int] = None
    tackles_total: Optional[int] = None
    tackles_blocks: Optional[int] = None
    tackles_interceptions: Optional[int] = None
    duels_total: Optional[int] = None
    duels_won: Optional[int] = None
    dribbles_attempts: Optional[int] = None
    dribbles_success: Optional[int] = None
    dribbles_past: Optional[int] = None
    fouls_drawn: Optional[int] = None
    fouls_committed: Optional[int] = None
    cards_yellow: Optional[int] = None
    cards_red: Optional[int] = None
    penalty_won: Optional[int] = None
    penalty_committed: Optional[int] = None
    penalty_scored: Optional[int] = None
    penalty_missed: Optional[int] = None
    penalty_saved: Optional[int] = None


class PlayerStatisticResponse(PlayerStatisticBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None  # ← Optional!

    model_config = ConfigDict(from_attributes=True)
