from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator


class CountryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Country name")
    code: Optional[str] = Field(
        None, min_length=2, max_length=3, description="ISO 3166-1 alpha-2/3 code"
    )
    flag_url: Optional[HttpUrl] = Field(None, description="URL to flag image")

    @field_validator("name")
    @classmethod
    def name_must_not_be_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("name must not be blank")
        return v.strip()

    @field_validator("code")
    @classmethod
    def code_uppercase(cls, v: Optional[str]) -> Optional[str]:
        return v.upper() if v else v


class CountryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    code: Optional[str] = None
    flag_url: Optional[str] = None
    created_at: datetime
