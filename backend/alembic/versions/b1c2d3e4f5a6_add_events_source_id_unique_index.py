"""add_events_source_id_unique_index

Revision ID: b1c2d3e4f5a6
Revises: f6a7b8c9d0e1
Create Date: 2026-03-22

Partial unique index on events.source_id (WHERE source_id IS NOT NULL).
Prevents duplicate event imports when n8n fires the same event multiple times.
NULL values are excluded so events without source_id remain unrestricted.
"""
from typing import Sequence, Union

from alembic import op

revision: str = "b1c2d3e4f5a6"
down_revision: Union[str, None] = "f6a7b8c9d0e1"
branch_labels: Union[Sequence[str], None] = None
depends_on: Union[Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE UNIQUE INDEX uq_events_source_id
        ON events (source_id)
        WHERE source_id IS NOT NULL
        """
    )


def downgrade() -> None:
    op.execute('DROP INDEX IF EXISTS uq_events_source_id')
