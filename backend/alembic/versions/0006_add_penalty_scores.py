"""add penalty_home_score and penalty_away_score to matches

Revision ID: 0006
Revises: 0005
Create Date: 2026-04-23
"""

from alembic import op

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE matches
        ADD COLUMN IF NOT EXISTS penalty_home_score INTEGER,
        ADD COLUMN IF NOT EXISTS penalty_away_score INTEGER
    """)


def downgrade() -> None:
    op.execute("""
        ALTER TABLE matches
        DROP COLUMN IF EXISTS penalty_home_score,
        DROP COLUMN IF EXISTS penalty_away_score
    """)
