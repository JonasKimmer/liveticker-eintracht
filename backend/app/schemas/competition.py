from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator


class LocalizedTitle(BaseModel):
    """Localized string map – at least one language expected."""

    de: Optional[str] = Field(None, max_length=100)
    en: Optional[str] = Field(None, max_length=100)

    model_config = ConfigDict(extra="allow")  # allow additional language keys


class CompetitionCreate(BaseModel):
    external_id: Optional[int] = Field(
        None, gt=0, description="ID from external source (api-sports)"
    )
    sport: str = Field("Football", max_length=20)
    title: Optional[str] = Field(None, max_length=100)
    localized_title: Optional[LocalizedTitle] = None
    short_title: Optional[str] = Field(None, max_length=20)
    logo_url: Optional[HttpUrl] = None
    matchcenter_image_url: Optional[HttpUrl] = None
    has_standings_per_matchday: bool = False
    hidden: bool = False
    position: int = Field(1, ge=1)
    # source is set server-side only
    source: str = Field("partner", max_length=20, exclude=True)

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("title must not be blank")
        return v.strip() if v else v


class CompetitionUpdate(BaseModel):
    """Only fields a client is allowed to mutate."""

    title: Optional[str] = Field(None, max_length=100)
    localized_title: Optional[LocalizedTitle] = None
    short_title: Optional[str] = Field(None, max_length=20)
    logo_url: Optional[HttpUrl] = None
    matchcenter_image_url: Optional[HttpUrl] = None
    has_standings_per_matchday: Optional[bool] = None
    hidden: Optional[bool] = None
    position: Optional[int] = Field(None, ge=1)

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("title must not be blank")
        return v.strip() if v else v


class CompetitionResponse(BaseModel):
    """Public API response – source intentionally excluded."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    uid: UUID
    external_id: Optional[int] = None
    sport: str
    title: Optional[str] = None
    localized_title: Optional[dict] = None
    short_title: Optional[str] = None
    logo_url: Optional[str] = None
    matchcenter_image_url: Optional[str] = None
    has_standings_per_matchday: bool
    hidden: bool
    position: int
    created_at: datetime
    updated_at: datetime
