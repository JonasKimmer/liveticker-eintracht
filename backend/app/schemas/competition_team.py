from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class CompetitionTeamCreate(BaseModel):
    season_id: int = Field(..., gt=0)
    competition_id: int = Field(..., gt=0)
    team_id: int = Field(..., gt=0)


class CompetitionTeamResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    season_id: int
    competition_id: int
    team_id: int
    created_at: datetime
