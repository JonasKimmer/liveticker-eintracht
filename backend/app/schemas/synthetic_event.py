from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Any, Optional


class SyntheticEventCreate(BaseModel):
    match_id: int
    type: Optional[str] = None
    minute: Optional[int] = None
    data: Optional[dict[str, Any]] = None


class SyntheticEventUpdate(BaseModel):
    type: Optional[str] = None
    minute: Optional[int] = None
    data: Optional[dict[str, Any]] = None


class SyntheticEvent(BaseModel):
    id: int
    match_id: int
    type: Optional[str]
    minute: Optional[int]
    data: Optional[dict[str, Any]]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
