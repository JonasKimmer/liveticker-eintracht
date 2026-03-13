"""add_source_to_media_clips

Revision ID: ebdc83618de9
Revises: d7fee2c579ca
Create Date: 2026-03-13 13:54:58.174198

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ebdc83618de9'
down_revision: Union[str, None] = 'd7fee2c579ca'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    result = conn.execute(sa.text(
        "SELECT 1 FROM information_schema.columns "
        "WHERE table_name='media_clips' AND column_name='source'"
    ))
    if not result.fetchone():
        op.add_column('media_clips', sa.Column('source', sa.String(50), nullable=True, server_default='bundesliga'))


def downgrade() -> None:
    op.drop_column('media_clips', 'source')
