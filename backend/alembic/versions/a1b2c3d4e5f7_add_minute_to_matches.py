"""add_minute_to_matches

Revision ID: a1b2c3d4e5f7
Revises: c90aeef9926d
Create Date: 2026-03-15 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f7'
down_revision: Union[str, None] = 'c90aeef9926d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('matches', sa.Column('minute', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('matches', 'minute')
