from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class MediaItemIn(BaseModel):
    """Eingehendes Bild-Objekt von n8n."""
    media_id: int
    name: Optional[str] = None
    thumbnail_url: Optional[str] = None
    compressed_url: Optional[str] = None
    original_url: Optional[str] = None
    event_id: Optional[int] = None


class MediaItemResponse(BaseModel):
    """Bild-Objekt für Frontend-Responses."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    media_id: int
    name: Optional[str] = None
    thumbnail_url: Optional[str] = None
    compressed_url: Optional[str] = None
    original_url: Optional[str] = None
    event_id: Optional[int] = None
    status: str
    description: Optional[str] = None
    created_at: datetime


class PublishMediaRequest(BaseModel):
    """Request Body für POST /media/publish."""
    media_id: int
    description: str
    match_id: int
    minute: Optional[int] = None
    icon: Optional[str] = None


class GenerateCaptionRequest(BaseModel):
    """Request Body für POST /media/generate-caption/{media_id}."""
    style: str = "neutral"
    instance: str = "ef_whitelabel"
