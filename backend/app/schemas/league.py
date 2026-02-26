"""
Pydantic Schemas für League.
"""

from datetime import datetime
from pydantic import BaseModel, ConfigDict


class LeagueBase(BaseModel):
    """Basis-Schema für League."""

    name: str
    country: str | None = None
    logo_url: str | None = None
    type: str | None = None


class LeagueCreate(LeagueBase):
    """Schema zum Erstellen einer League."""

    external_id: int | None = None


class LeagueUpdate(BaseModel):
    """Schema zum Aktualisieren einer League."""

    name: str | None = None
    country: str | None = None
    logo_url: str | None = None
    type: str | None = None


class League(LeagueBase):
    """Vollständiges League-Schema (DB → API)."""

    id: int
    external_id: int | None
    created_at: datetime
    updated_at: datetime | None

    model_config = ConfigDict(from_attributes=True)
