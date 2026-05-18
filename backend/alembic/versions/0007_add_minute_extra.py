"""add minute_extra to matches

Revision ID: 0007
Revises: 0006
Create Date: 2026-04-23
"""

from alembic import op

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE matches
        ADD COLUMN IF NOT EXISTS minute_extra INTEGER DEFAULT NULL
    """)


def downgrade() -> None:
    op.execute("ALTER TABLE matches DROP COLUMN IF EXISTS minute_extra")
