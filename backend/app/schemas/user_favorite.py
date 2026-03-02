from datetime import datetime
from pydantic import BaseModel, ConfigDict

from app.schemas.team import TeamResponse


class UserFavoriteCreate(BaseModel):
    team_id: int


class UserFavoriteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    team_id: int
    team: TeamResponse
    created_at: datetime
