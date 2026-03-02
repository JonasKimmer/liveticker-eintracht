from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator
from pydantic.alias_generators import to_camel


class CountryCreate(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
    )

    name: str = Field(..., min_length=1, max_length=100)
    code: Optional[str] = Field(None, min_length=2, max_length=3, description="ISO 3166-1 alpha-2/3")
    flag_url: Optional[HttpUrl] = None

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
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        alias_generator=to_camel,
    )

    id: int
    name: str
    code: Optional[str] = None
    flag_url: Optional[str] = None