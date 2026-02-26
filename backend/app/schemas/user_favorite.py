"""
Pydantic Schemas für UserFavorite.
"""

from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.schemas.team import Team


class UserFavoriteBase(BaseModel):
    """Basis-Schema für UserFavorite."""

    user_id: int
    team_id: int


class UserFavoriteCreate(UserFavoriteBase):
    """Schema zum Erstellen eines Favoriten."""

    pass


class UserFavorite(UserFavoriteBase):
    """Vollständiges UserFavorite-Schema."""

    id: int
    team: Team  # ← Relationship!
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
