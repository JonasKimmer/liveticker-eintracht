"""add player_name to lineups

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-03-11
"""
from alembic import op
import sqlalchemy as sa

revision = "f6a7b8c9d0e1"
down_revision = "e5f6a7b8c9d0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("lineups", sa.Column("player_name", sa.String(200), nullable=True))


def downgrade() -> None:
    op.drop_column("lineups", "player_name")
