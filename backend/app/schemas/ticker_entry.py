from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional


class TickerEntryCreate(BaseModel):
    match_id: int
    event_id: Optional[int] = None
    text: str
    style: Optional[str] = None
    icon: Optional[str] = None
    llm_model: Optional[str] = None
    status: str = "draft"
    source: str = "ai"  # ai | manual


class TickerEntryUpdate(BaseModel):
    text: Optional[str] = None
    status: Optional[str] = None
    style: Optional[str] = None


class TickerEntry(BaseModel):
    id: int
    match_id: int
    event_id: Optional[int]
    text: str
    style: Optional[str]
    icon: Optional[str]
    llm_model: Optional[str]
    status: str
    source: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
