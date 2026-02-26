# app/schemas/synthetic_event.py

from datetime import datetime
from typing import Any
from pydantic import BaseModel, ConfigDict


class SyntheticEventBase(BaseModel):
    match_id: int
    team_id: int | None = None
    event_type: str
    severity: str | None = None
    context_data: dict[str, Any] | None = None
    auto_generated: bool = False
    ticker_text: str | None = None
    ticker_style: str | None = None
    minute: int | None = None


class SyntheticEventCreate(SyntheticEventBase):
    pass


class SyntheticEventUpdate(BaseModel):
    ticker_text: str | None = None
    ticker_style: str | None = None
    auto_generated: bool | None = None
    severity: str | None = None


class SyntheticEvent(SyntheticEventBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class GenerateSyntheticRequest(BaseModel):
    synthetic_event_id: int
    style: str = "neutral"
    language: str = "de"
    llm_provider: str = "openai"
    llm_model: str | None = None


class GenerateSyntheticResponse(BaseModel):
    ticker_entry_id: int
    synthetic_event_id: int
    text: str
    llm_model: str
    llm_provider: str
