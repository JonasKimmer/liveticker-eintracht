"""merge_all_heads

Revision ID: 14336e02414a
Revises: a2b3c4d5e6f7, c2d3e4f5a6b7, h2i3j4k5l6m7
Create Date: 2026-03-24 10:10:10.902208

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '14336e02414a'
down_revision: Union[str, None] = ('a2b3c4d5e6f7', 'c2d3e4f5a6b7', 'h2i3j4k5l6m7')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
