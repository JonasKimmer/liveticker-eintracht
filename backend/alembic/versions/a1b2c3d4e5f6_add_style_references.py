"""add style_references table

Revision ID: a1b2c3d4e5f6
Revises: <deine_letzte_revision>
Create Date: 2026-03-06
"""

from alembic import op
import sqlalchemy as sa

revision = "a1b2c3d4e5f6"
down_revision = "7f1739cda3fe"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "style_references",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("match_day", sa.Integer(), nullable=True),
        sa.Column("match_label", sa.String(100), nullable=True),
        sa.Column("league", sa.String(50), nullable=True),
        sa.Column("event_type", sa.String(50), nullable=False),
        sa.Column("minute", sa.Integer(), nullable=True),
        sa.Column("extra_time", sa.Integer(), nullable=True),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column(
            "instance", sa.String(20), nullable=False, server_default="ef_whitelabel"
        ),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_style_references_event_type", "style_references", ["event_type"]
    )
    op.create_index("ix_style_references_instance", "style_references", ["instance"])
    # Kombinierter Index für den häufigsten Query: event_type + instance
    op.create_index(
        "ix_style_references_event_type_instance",
        "style_references",
        ["event_type", "instance"],
    )


def downgrade() -> None:
    op.drop_index("ix_style_references_event_type_instance", "style_references")
    op.drop_index("ix_style_references_instance", "style_references")
    op.drop_index("ix_style_references_event_type", "style_references")
    op.drop_table("style_references")
