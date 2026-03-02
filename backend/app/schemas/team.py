from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator

from app.schemas.country import CountryResponse


class TeamCreate(BaseModel):
    external_id: Optional[int] = Field(
        None, gt=0, description="ID from external source (api-sports)"
    )
    sport: str = Field("Football", max_length=20)
    name: str = Field(..., min_length=1, max_length=100)
    initials: Optional[str] = Field(None, max_length=10)
    short_name: Optional[str] = Field(None, max_length=100)
    logo_url: Optional[HttpUrl] = None
    is_partner_team: bool = False
    hidden: bool = False
    country_id: Optional[int] = Field(None, gt=0)
    # source is set server-side only, never from client
    source: str = Field("partner", max_length=20, exclude=True)

    @field_validator("name")
    @classmethod
    def name_must_not_be_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("name must not be blank")
        return v.strip()


class TeamUpdate(BaseModel):
    """Only fields a client is allowed to mutate."""

    name: Optional[str] = Field(None, min_length=1, max_length=100)
    initials: Optional[str] = Field(None, max_length=10)
    short_name: Optional[str] = Field(None, max_length=100)
    logo_url: Optional[HttpUrl] = None
    is_partner_team: Optional[bool] = None
    hidden: Optional[bool] = None
    country_id: Optional[int] = Field(None, gt=0)

    @field_validator("name")
    @classmethod
    def name_must_not_be_blank(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("name must not be blank")
        return v.strip() if v else v


class TeamResponse(BaseModel):
    """Public API response – source is intentionally excluded."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    uid: UUID
    external_id: Optional[int] = None
    sport: str
    name: str
    initials: Optional[str] = None
    short_name: Optional[str] = None
    logo_url: Optional[str] = None
    is_partner_team: bool
    hidden: bool
    country_id: Optional[int] = None
    country: Optional[CountryResponse] = None
    created_at: datetime
    updated_at: datetime
