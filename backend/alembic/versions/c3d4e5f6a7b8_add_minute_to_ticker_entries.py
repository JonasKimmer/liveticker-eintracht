"""add minute to ticker_entries

Revision ID: c3d4e5f6a7b8
Revises: 7f1739cda3fe
Create Date: 2026-03-06
"""

from alembic import op
import sqlalchemy as sa


revision = "c3d4e5f6a7b8"
down_revision = "7f1739cda3fe"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "ticker_entries",
        sa.Column("minute", sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("ticker_entries", "minute")
