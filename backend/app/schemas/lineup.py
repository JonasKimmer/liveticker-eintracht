from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class LineupPlayerCreate(BaseModel):
    match_id: int
    team_id: int
    player_id: int
    jersey_number: Optional[int] = None
    status: Optional[str] = None  # Start | Sub
    formation_place: Optional[int] = None
    formation_position: Optional[int] = None
    position: Optional[str] = None  # Goalkeeper | Defender | Midfielder | Forward
    number_of_goals: int = 0
    has_yellow_card: bool = False
    has_red_card: bool = False
    is_substituted: bool = False
    formation: Optional[str] = None  # z.B. "442"


class LineupPlayerUpdate(BaseModel):
    jersey_number: Optional[int] = None
    status: Optional[str] = None
    formation_place: Optional[int] = None
    formation_position: Optional[int] = None
    position: Optional[str] = None
    number_of_goals: Optional[int] = None
    has_yellow_card: Optional[bool] = None
    has_red_card: Optional[bool] = None
    is_substituted: Optional[bool] = None


class LineupPlayer(LineupPlayerCreate):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
