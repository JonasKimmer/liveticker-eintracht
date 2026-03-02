from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class CountryCreate(BaseModel):
    name: str
    code: Optional[str] = None
    flag_url: Optional[str] = None


class CountryUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    flag_url: Optional[str] = None


class Country(BaseModel):
    id: int
    name: str
    code: Optional[str] = None
    flag_url: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
