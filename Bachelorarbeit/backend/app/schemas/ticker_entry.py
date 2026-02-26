# ----------------------------------------
# app/schemas/ticker_entry.py
# ----------------------------------------
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime


class TickerEntryBase(BaseModel):
    match_id: int
    event_id: int | None = None
    minute: int = Field(ge=0, le=120)
    text: str = Field(min_length=1)
    icon: str | None = None
    status: str = Field(default="draft", pattern="^(draft|published)$")
    mode: str = Field(pattern="^(auto|hybrid|manual)$")
    style: str | None = Field(None, pattern="^(neutral|euphorisch|kritisch)$")
    language: str = Field(default="de", pattern="^(de|en|es|ja)$")
    llm_model: str | None = Field(None, max_length=50)
    prompt_used: str | None = None
    approved_by: int | None = None


class TickerEntryCreate(TickerEntryBase):
    pass


class TickerEntryUpdate(BaseModel):
    text: str | None = Field(None, min_length=1)
    status: str | None = Field(None, pattern="^(draft|published)$")
    published_at: datetime | None = None


class TickerEntry(TickerEntryBase):
    id: int
    created_at: datetime
    published_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
