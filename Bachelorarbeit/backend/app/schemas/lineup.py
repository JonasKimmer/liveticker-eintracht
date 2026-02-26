# app/schemas/lineup.py

from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class LineupBase(BaseModel):
    match_id: int
    team_id: int
    formation: Optional[str] = None
    coach_id: Optional[int] = None
    coach_name: Optional[str] = None
    player_id: int
    player_name: str
    number: Optional[int] = None
    position: Optional[str] = None
    grid: Optional[str] = None
    is_substitute: bool = False


class LineupCreate(LineupBase):
    pass


class LineupUpdate(BaseModel):
    number: Optional[int] = None
    position: Optional[str] = None
    grid: Optional[str] = None
    is_substitute: Optional[bool] = None


class LineupResponse(LineupBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
