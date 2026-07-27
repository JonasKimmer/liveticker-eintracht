"""add generation_ms column to ticker_entries

Revision ID: 0005
Revises: 0004
Create Date: 2026-04-02
"""

from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE ticker_entries
        ADD COLUMN IF NOT EXISTS generation_ms INTEGER
    """)


def downgrade() -> None:
    op.execute("""
        ALTER TABLE ticker_entries
        DROP COLUMN IF EXISTS generation_ms
    """)
