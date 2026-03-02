import math
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator
from pydantic.alias_generators import to_camel


class TeamCategory(BaseModel):
    de: Optional[str] = Field(None, max_length=100)
    en: Optional[str] = Field(None, max_length=100)


class TeamCreate(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
    )

    id: Optional[int] = Field(None, gt=0)
    sport: str = Field("Football", max_length=20)
    name: str = Field(..., min_length=1, max_length=100)
    initials: Optional[str] = Field(None, max_length=10)
    short_name: Optional[str] = Field(None, max_length=100)
    category: Optional[TeamCategory] = None
    logo_url: Optional[HttpUrl] = None
    is_partner_team: bool = False
    position: int = Field(0, ge=0)
    hidden: bool = False

    @field_validator("name")
    @classmethod
    def name_must_not_be_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("name must not be blank")
        return v.strip()


class TeamUpdate(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
    )

    sport: Optional[str] = Field(None, max_length=20)
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    initials: Optional[str] = Field(None, max_length=10)
    short_name: Optional[str] = Field(None, max_length=100)
    category: Optional[TeamCategory] = None
    logo_url: Optional[HttpUrl] = None
    is_partner_team: Optional[bool] = None
    position: Optional[int] = Field(None, ge=0)
    hidden: Optional[bool] = None

    @field_validator("name")
    @classmethod
    def name_must_not_be_blank(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("name must not be blank")
        return v.strip() if v else v


class TeamResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        alias_generator=to_camel,
    )

    id: int
    uid: UUID = Field(serialization_alias="uId")
    sport: str
    name: str
    initials: Optional[str] = None
    short_name: Optional[str] = None
    category: Optional[dict] = None
    logo_url: Optional[str] = None
    is_partner_team: bool
    position: int
    hidden: bool


class PaginatedTeamResponse(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
    )

    items: list[TeamResponse]
    total: int
    page: int
    page_size: int
    page_count: int
    has_previous_page: bool
    has_next_page: bool