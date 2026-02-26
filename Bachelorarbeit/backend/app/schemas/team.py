#  app/schemas/team.py
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime


class TeamBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    short_name: str | None = None
    code: str | None = None
    logo_url: str | None = None
    country: str | None = None
    founded: int | None = None
    venue_name: str | None = None
    venue_capacity: int | None = None
    external_id: int | None = None
    is_partner: bool = False


class TeamCreate(TeamBase):
    pass


class TeamUpdate(BaseModel):
    name: str | None = None
    short_name: str | None = None
    code: str | None = None
    logo_url: str | None = None
    country: str | None = None
    founded: int | None = None
    venue_name: str | None = None
    venue_capacity: int | None = None
    is_partner: bool | None = None


class Team(TeamBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
