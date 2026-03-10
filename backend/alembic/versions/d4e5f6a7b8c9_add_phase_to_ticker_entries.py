"""add phase to ticker_entries

Revision ID: d4e5f6a7b8c9
Revises: 0258fdd77bec
Create Date: 2026-03-10
"""

from alembic import op
import sqlalchemy as sa


revision = "d4e5f6a7b8c9"
down_revision = "0258fdd77bec"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "ticker_entries",
        sa.Column("phase", sa.String(50), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("ticker_entries", "phase")
