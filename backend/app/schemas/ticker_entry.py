from datetime import datetime
from enum import Enum
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

# Shared Literal types – used in ticker.py request schemas
TickerStyle = Literal["neutral", "euphorisch", "kritisch"]
TickerInstance = Literal["generic", "ef_whitelabel"]


class TickerStatus(str, Enum):
    draft = "draft"
    published = "published"
    rejected = "rejected"


class TickerSource(str, Enum):
    ai = "ai"
    manual = "manual"


class TickerEntryCreate(BaseModel):
    match_id: int = Field(..., gt=0)
    event_id: Optional[int] = Field(None, gt=0)
    synthetic_event_id: Optional[int] = Field(None, gt=0)
    text: str = Field(..., min_length=1)
    style: Optional[str] = Field(None, max_length=50)
    icon: Optional[str] = Field(None, max_length=50)
    llm_model: Optional[str] = Field(None, max_length=100)
    status: TickerStatus = TickerStatus.draft
    source: TickerSource = TickerSource.ai
    minute: Optional[int] = None
    phase: Optional[str] = Field(None, max_length=50)
    image_url: Optional[str] = None
    video_url: Optional[str] = None


class TickerEntryUpdate(BaseModel):
    text: Optional[str] = Field(None, min_length=1)
    status: Optional[TickerStatus] = None
    style: Optional[str] = Field(None, max_length=50)
    icon: Optional[str] = Field(None, max_length=50)


class TickerEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    match_id: int
    event_id: Optional[int] = None
    text: str
    style: Optional[str] = None
    icon: Optional[str] = None
    llm_model: Optional[str] = None
    status: TickerStatus
    source: TickerSource
    minute: Optional[int] = None
    phase: Optional[str] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    created_at: datetime
