"""add_media_clips_vid_unique_index

Revision ID: c2d3e4f5a6b7
Revises: b1c2d3e4f5a6
Create Date: 2026-03-22

Partial unique index on media_clips.vid (WHERE vid IS NOT NULL).
Verhindert doppelte Clip-Imports bei parallelen n8n-Requests.
"""
from typing import Sequence, Union

from alembic import op

revision: str = "c2d3e4f5a6b7"
down_revision: Union[str, None] = "b1c2d3e4f5a6"
branch_labels: Union[Sequence[str], None] = None
depends_on: Union[Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE UNIQUE INDEX uq_media_clips_vid
        ON media_clips (vid)
        WHERE vid IS NOT NULL
        """
    )


def downgrade() -> None:
    op.drop_index("uq_media_clips_vid", table_name="media_clips")
