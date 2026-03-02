from uuid import UUID

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CompetitionTeamAssignResponse(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
    )

    uid: UUID
    season_id: int
    competition_id: int
    team_id: int
    sport: str