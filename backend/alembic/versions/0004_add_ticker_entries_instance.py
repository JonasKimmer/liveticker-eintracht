"""add instance column to ticker_entries

Revision ID: 0004
Revises: 0003
Create Date: 2026-03-30
"""

from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE ticker_entries
        ADD COLUMN IF NOT EXISTS instance VARCHAR(20)
    """)


def downgrade() -> None:
    op.execute("""
        ALTER TABLE ticker_entries
        DROP COLUMN IF EXISTS instance
    """)
