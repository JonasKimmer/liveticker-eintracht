"""add style_references dedup index

Revision ID: g1h2i3j4k5l6
Revises: 66ec43e6194f
Create Date: 2026-03-23

Fügt einen Unique-Index auf style_references hinzu, damit
ON CONFLICT DO NOTHING im n8n-Import-Workflow greift
und Duplikate verhindert werden.

Dedup-Key: (match_label, event_type, COALESCE(minute,-1), LEFT(text,300))
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = "g1h2i3j4k5l6"
down_revision: Union[str, None] = "66ec43e6194f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS style_references_dedup_idx
        ON style_references (
            COALESCE(match_label, ''),
            event_type,
            COALESCE(minute, -1),
            LEFT(text, 300)
        )
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS style_references_dedup_idx")
