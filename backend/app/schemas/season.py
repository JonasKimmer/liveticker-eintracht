from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class SeasonCreate(BaseModel):
    external_id: Optional[int] = Field(
        None, gt=0, description="ID from external source (api-sports)"
    )
    sport: str = Field("Football", max_length=20)
    title: str = Field(..., min_length=1, max_length=100)
    short_title: Optional[str] = Field(None, max_length=20)
    starts_at: Optional[date] = None
    ends_at: Optional[date] = None
    # source is set server-side only
    source: str = Field("partner", max_length=20, exclude=True)

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("title must not be blank")
        return v.strip()

    @model_validator(mode="after")
    def ends_after_starts(self) -> "SeasonCreate":
        if self.starts_at and self.ends_at and self.ends_at <= self.starts_at:
            raise ValueError("ends_at must be after starts_at")
        return self


class SeasonUpdate(BaseModel):
    """Only fields a client is allowed to mutate."""

    sport: Optional[str] = Field(None, max_length=20)
    title: Optional[str] = Field(None, min_length=1, max_length=100)
    short_title: Optional[str] = Field(None, max_length=20)
    starts_at: Optional[date] = None
    ends_at: Optional[date] = None

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("title must not be blank")
        return v.strip() if v else v

    @model_validator(mode="after")
    def ends_after_starts(self) -> "SeasonUpdate":
        if self.starts_at and self.ends_at and self.ends_at <= self.starts_at:
            raise ValueError("ends_at must be after starts_at")
        return self


class SeasonResponse(BaseModel):
    """Public API response – source intentionally excluded."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    uid: UUID
    external_id: Optional[int] = None
    sport: str
    title: str
    short_title: Optional[str] = None
    starts_at: Optional[date] = None
    ends_at: Optional[date] = None
    created_at: datetime
    updated_at: datetime


class PaginatedSeasonResponse(BaseModel):
    """Paginated wrapper for season lists."""

    items: list[SeasonResponse]
    total: int
    page: int
    page_size: int
    page_count: int
    has_previous_page: bool
    has_next_page: bool
