from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class MediaClipImport(BaseModel):
    vid: Optional[str] = None
    video_url: str
    thumbnail_url: Optional[str] = None
    title: Optional[str] = None
    player_name: Optional[str] = None
    team_name: Optional[str] = None
    source: Optional[str] = "bundesliga"


class MediaClipImportRequest(BaseModel):
    match_id: Optional[int] = None
    clips: list[MediaClipImport]


class MediaClipResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    match_id: Optional[int] = None
    vid: Optional[str] = None
    video_url: str
    thumbnail_url: Optional[str] = None
    title: Optional[str] = None
    player_name: Optional[str] = None
    team_name: Optional[str] = None
    source: Optional[str] = None
    published: bool
    created_at: datetime


class ClipPublishRequest(BaseModel):
    match_id: int
    text: str = Field(..., min_length=1)
    minute: Optional[int] = None
    phase: Optional[str] = None
    icon: Optional[str] = "🎬"


class CacheThumbnailRequest(BaseModel):
    vid: str
    thumbnail_url: str
