from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.core.enums import TickerSource, TickerStatus

# Re-export so existing imports like `from app.schemas.ticker_entry import TickerStatus` keep working.
__all__ = ["TickerStatus", "TickerSource"]

# Shared Literal types – used in ticker.py request schemas
TickerStyle = Literal["neutral", "euphorisch", "kritisch"]
TickerInstance = Literal["generic", "ef_whitelabel"]


class TickerEntryCreate(BaseModel):
    match_id: int = Field(..., gt=0)
    event_id: Optional[int] = Field(None, gt=0)
    synthetic_event_id: Optional[int] = Field(None, gt=0)
    text: str = Field("", max_length=5000)
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


class BaseGenerateRequest(BaseModel):
    """Gemeinsame Felder für alle KI-Generierungs-Requests."""
    style: TickerStyle = "neutral"
    language: str = Field(default="de", max_length=5)
    instance: TickerInstance = "ef_whitelabel"
    auto_publish: bool = False


class GenerateEventRequest(BaseGenerateRequest):
    provider: Optional[str] = Field(
        default=None, description="Provider override für Evaluation"
    )
    model: Optional[str] = Field(
        default=None, description="Modell override für Evaluation"
    )
    auto_publish: bool = Field(
        default=False, description="Modus 2: direkt publizieren ohne Review"
    )


class GenerateSyntheticRequest(BaseGenerateRequest):
    synthetic_event_id: int
    provider: Optional[str] = None
    model: Optional[str] = None


class GenerateSyntheticBatchRequest(BaseGenerateRequest):
    auto_publish: bool = True


class TranslateBatchRequest(BaseModel):
    language: str = Field(default="en", max_length=5)


class ManualEntryRequest(BaseModel):
    match_id: int
    text: str = Field("", max_length=2000)
    event_id: Optional[int] = None
    style: Optional[str] = None
    icon: Optional[str] = None
    minute: Optional[int] = None
    phase: Optional[str] = Field(None, max_length=50)
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    status: Optional[TickerStatus] = None


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
