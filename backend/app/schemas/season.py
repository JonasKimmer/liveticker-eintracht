from pydantic import BaseModel, ConfigDict
from datetime import datetime, date
from typing import Optional


class SeasonCreate(BaseModel):
    external_id: Optional[int] = None
    uid: Optional[str] = None
    sport: str = "Football"
    title: str
    short_title: Optional[str] = None
    starts_at: Optional[date] = None
    ends_at: Optional[date] = None
    source: str = "partner"


class SeasonUpdate(BaseModel):
    title: Optional[str] = None
    short_title: Optional[str] = None
    starts_at: Optional[date] = None
    ends_at: Optional[date] = None


class Season(BaseModel):
    id: int
    external_id: Optional[int] = None
    uid: Optional[str] = None
    sport: str
    title: str
    short_title: Optional[str] = None
    starts_at: Optional[date] = None
    ends_at: Optional[date] = None
    source: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
