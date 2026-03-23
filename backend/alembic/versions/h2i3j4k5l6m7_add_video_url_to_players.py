"""add video_url to players

Revision ID: h2i3j4k5l6m7
Revises: g1h2i3j4k5l6
Create Date: 2026-03-23

Speichert den S3-Link zum Torjubel-Video eines Spielers,
damit n8n diesen bei Toren automatisch als Ticker-Eintrag posten kann.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = "h2i3j4k5l6m7"
down_revision: Union[str, None] = "g1h2i3j4k5l6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("players", sa.Column("video_url", sa.String(500), nullable=True))


def downgrade() -> None:
    op.drop_column("players", "video_url")
