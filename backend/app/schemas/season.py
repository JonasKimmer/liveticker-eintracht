from datetime import date
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from pydantic.alias_generators import to_camel

from app.schemas.base import PaginatedResponse


class SeasonCreate(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
    )

    id: Optional[int] = Field(None, gt=0)
    sport: str = Field("Football", max_length=20)
    title: str = Field(..., min_length=1, max_length=100)
    short_title: Optional[str] = Field(None, max_length=20)
    starts_at: Optional[date] = None
    ends_at: Optional[date] = None

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
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
    )

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
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        alias_generator=to_camel,
    )

    id: int
    uid: UUID
    sport: str
    title: str
    short_title: Optional[str] = None
    starts_at: Optional[date] = None
    ends_at: Optional[date] = None


class PaginatedSeasonResponse(PaginatedResponse[SeasonResponse]):
    pass
