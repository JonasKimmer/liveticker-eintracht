"""
Pydantic Schemas für Season.
"""

from datetime import datetime, date
from pydantic import BaseModel, ConfigDict


class SeasonBase(BaseModel):
    """Basis-Schema für Season."""

    year: int
    current: bool = False


class SeasonCreate(SeasonBase):
    """Schema zum Erstellen einer Season."""

    start_date: date | None = None
    end_date: date | None = None


class SeasonUpdate(BaseModel):
    """Schema zum Aktualisieren einer Season."""

    year: int | None = None
    start_date: date | None = None
    end_date: date | None = None
    current: bool | None = None


class Season(SeasonBase):
    """Vollständiges Season-Schema (DB → API)."""

    id: int
    start_date: date | None
    end_date: date | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
