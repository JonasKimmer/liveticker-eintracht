"""add ticker_mode to matches

Revision ID: 0001
Revises: 0000
Create Date: 2026-03-24
"""
from alembic import op

revision = "0001"
down_revision = "0000"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE matches
        ADD COLUMN IF NOT EXISTS ticker_mode VARCHAR(10) NOT NULL DEFAULT 'coop'
    """)


def downgrade() -> None:
    op.execute("ALTER TABLE matches DROP COLUMN IF EXISTS ticker_mode")
