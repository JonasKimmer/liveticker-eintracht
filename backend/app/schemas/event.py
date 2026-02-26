# app/schemas/event.py
"""
Pydantic Schemas für Event-Daten.
Validierung für Spielereignisse.
"""

from pydantic import BaseModel, Field
from datetime import datetime


class EventBase(BaseModel):
    """Basis-Schema mit gemeinsamen Feldern."""

    match_id: int
    minute: int = Field(ge=0, le=120)
    extra_time: int | None = None
    team_id: int | None = None
    player_id: int | None = None
    player_name: str | None = Field(None, max_length=100)
    assist_id: int | None = None
    assist_name: str | None = Field(None, max_length=100)
    type: str = Field(max_length=50)  # Goal, Card, subst
    detail: str | None = Field(None, max_length=100)  # Normal Goal, Yellow Card
    comments: str | None = None


class EventCreate(EventBase):
    """Schema für Event-Erstellung (POST)."""

    pass


class EventUpdate(BaseModel):
    """Schema für Event-Updates (PATCH)."""

    minute: int | None = Field(None, ge=0, le=120)
    extra_time: int | None = None
    team_id: int | None = None
    player_id: int | None = None
    player_name: str | None = Field(None, max_length=100)
    assist_id: int | None = None
    assist_name: str | None = Field(None, max_length=100)
    type: str | None = Field(None, max_length=50)
    detail: str | None = Field(None, max_length=100)
    comments: str | None = None


class Event(EventBase):
    """Schema für Event-Response (GET)."""

    id: int
    created_at: datetime

    class Config:
        from_attributes = True
