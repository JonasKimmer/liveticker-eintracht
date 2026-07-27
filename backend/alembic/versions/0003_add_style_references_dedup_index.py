"""add unique dedup index on style_references

Revision ID: 0003
Revises: 0002
Create Date: 2026-03-30
"""

from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS uix_style_references_dedup
        ON style_references (
            COALESCE(match_label, ''),
            event_type,
            COALESCE(minute, -1),
            LEFT(text, 300)
        )
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uix_style_references_dedup")
