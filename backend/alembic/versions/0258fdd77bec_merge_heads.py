"""merge_heads

Revision ID: 0258fdd77bec
Revises: c3d4e5f6a7b8, a1b2c3d4e5f6
Create Date: 2026-03-06 16:55:57.932854

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0258fdd77bec'
down_revision: Union[str, None] = ('c3d4e5f6a7b8', 'a1b2c3d4e5f6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
