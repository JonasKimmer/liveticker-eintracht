"""add synthetic_event_id to ticker_entries

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-03-10
"""
from alembic import op
import sqlalchemy as sa

revision = "e5f6a7b8c9d0"
down_revision = "d4e5f6a7b8c9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "ticker_entries",
        sa.Column("synthetic_event_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_ticker_entries_synthetic_event_id",
        "ticker_entries",
        "synthetic_events",
        ["synthetic_event_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.execute('ALTER TABLE ticker_entries DROP CONSTRAINT IF EXISTS fk_ticker_entries_synthetic_event_id')
    op.drop_column("ticker_entries", "synthetic_event_id")
