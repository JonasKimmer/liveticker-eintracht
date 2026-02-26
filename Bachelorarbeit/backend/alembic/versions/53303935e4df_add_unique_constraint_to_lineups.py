"""add unique constraint to lineups

Revision ID: 53303935e4df
Revises: 8a05173a120e
Create Date: 2026-02-17 23:46:59.009993

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '53303935e4df'
down_revision: Union[str, None] = '8a05173a120e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
