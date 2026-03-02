from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class TeamCreate(BaseModel):
    external_id: Optional[int] = None
    uid: Optional[str] = None
    sport: str = "Football"
    name: str
    initials: Optional[str] = None
    short_name: Optional[str] = None
    logo_url: Optional[str] = None
    is_partner_team: bool = False
    hidden: bool = False
    source: str = "partner"


class TeamUpdate(BaseModel):
    name: Optional[str] = None
    initials: Optional[str] = None
    short_name: Optional[str] = None
    logo_url: Optional[str] = None
    is_partner_team: Optional[bool] = None
    hidden: Optional[bool] = None


class Team(BaseModel):
    id: int
    external_id: Optional[int] = None
    uid: Optional[str] = None
    sport: str
    name: str
    initials: Optional[str] = None
    short_name: Optional[str] = None
    logo_url: Optional[str] = None
    is_partner_team: bool
    hidden: bool
    source: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
