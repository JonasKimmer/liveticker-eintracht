from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator
from pydantic.alias_generators import to_camel


class LocalizedTitle(BaseModel):
    de: Optional[str] = Field(None, max_length=100)
    en: Optional[str] = Field(None, max_length=100)


class CompetitionCreate(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
    )

    sport: str = Field("Football", max_length=20)
    id: Optional[int] = Field(None, gt=0)
    title: Optional[str] = Field(None, max_length=100)
    localized_title: Optional[LocalizedTitle] = None
    short_title: Optional[str] = Field(None, max_length=20)
    logo_url: Optional[HttpUrl] = None
    matchcenter_image_url: Optional[HttpUrl] = None
    has_standings_per_matchday: bool = False
    hidden: bool = False
    position: int = Field(1, ge=1)

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("title must not be blank")
        return v.strip() if v else v


class CompetitionUpdate(BaseModel):
    """Fields a client may update via PUT."""

    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
    )

    sport: Optional[str] = Field(None, max_length=20)
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
    """Partner API-compatible response schema. uid is auto-generated on create."""

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        alias_generator=to_camel,
    )

    sport: str
    id: int
    uid: UUID
    title: Optional[str] = None
    localized_title: Optional[dict] = None
    short_title: Optional[str] = None
    position: int
    hidden: bool
    logo_url: Optional[str] = None
    matchcenter_image_url: Optional[str] = None
    has_standings_per_matchday: bool
