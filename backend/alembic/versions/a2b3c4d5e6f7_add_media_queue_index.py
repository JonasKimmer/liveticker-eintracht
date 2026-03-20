"""add_media_queue_media_id_index

Revision ID: a2b3c4d5e6f7
Revises: 66ec43e6194f
Create Date: 2026-03-20

"""
from typing import Sequence, Union

from alembic import op

revision: str = "a2b3c4d5e6f7"
down_revision: Union[str, None] = "66ec43e6194f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        "ix_media_queue_media_id",
        "media_queue",
        ["media_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_media_queue_media_id", table_name="media_queue")
