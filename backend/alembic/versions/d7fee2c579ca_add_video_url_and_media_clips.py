"""add_video_url_and_media_clips

Revision ID: d7fee2c579ca
Revises: f6a7b8c9d0e1
Create Date: 2026-03-13 13:42:17.888572

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'd7fee2c579ca'
down_revision: Union[str, None] = 'f6a7b8c9d0e1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # Add video_url to ticker_entries (only if not already present)
    result = conn.execute(sa.text(
        "SELECT 1 FROM information_schema.columns "
        "WHERE table_name='ticker_entries' AND column_name='video_url'"
    ))
    if not result.fetchone():
        op.add_column('ticker_entries', sa.Column('video_url', sa.Text(), nullable=True))

    # Create media_clips table (only if not already present)
    result2 = conn.execute(sa.text(
        "SELECT 1 FROM information_schema.tables WHERE table_name='media_clips'"
    ))
    if not result2.fetchone():
        op.create_table(
            'media_clips',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('match_id', sa.Integer(), sa.ForeignKey('matches.id', ondelete='SET NULL'), nullable=True, index=True),
            sa.Column('vid', sa.String(100), nullable=True),
            sa.Column('video_url', sa.Text(), nullable=False),
            sa.Column('thumbnail_url', sa.Text(), nullable=True),
            sa.Column('title', sa.Text(), nullable=True),
            sa.Column('player_name', sa.Text(), nullable=True),
            sa.Column('team_name', sa.String(200), nullable=True),
            sa.Column('published', sa.Boolean(), nullable=False, server_default='false'),
            sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()')),
        )


def downgrade() -> None:
    op.execute('DROP TABLE IF EXISTS media_clips')
    op.drop_column('ticker_entries', 'video_url')
