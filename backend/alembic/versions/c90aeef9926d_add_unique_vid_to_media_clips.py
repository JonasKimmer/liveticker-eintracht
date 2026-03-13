"""add_unique_vid_to_media_clips

Revision ID: c90aeef9926d
Revises: ebdc83618de9
Create Date: 2026-03-13 14:04:12.575376

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c90aeef9926d'
down_revision: Union[str, None] = 'ebdc83618de9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index('ix_media_clips_vid', 'media_clips', ['vid'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_media_clips_vid', table_name='media_clips')
