# app/models/__init__.py
# Import all models so SQLAlchemy metadata and Alembic autogenerate see every table.
from app.models.competition import Competition
from app.models.competition_team import CompetitionTeam
from app.models.country import Country
from app.models.event import Event
from app.models.lineup import Lineup
from app.models.match import Match
from app.models.match_statistic import MatchStatistic
from app.models.media_clip import MediaClip
from app.models.media_queue import MediaQueue
from app.models.player import Player
from app.models.player_statistic import PlayerStatistic
from app.models.season import Season
from app.models.standing import Standing
from app.models.setting import Setting
from app.models.style_reference import StyleReference
from app.models.synthetic_event import SyntheticEvent
from app.models.team import Team
from app.models.ticker_entry import TickerEntry

__all__ = [
    "Competition",
    "CompetitionTeam",
    "Country",
    "Event",
    "Lineup",
    "Match",
    "MatchStatistic",
    "MediaClip",
    "MediaQueue",
    "Player",
    "PlayerStatistic",
    "Season",
    "Setting",
    "Standing",
    "StyleReference",
    "SyntheticEvent",
    "Team",
    "TickerEntry",
]
