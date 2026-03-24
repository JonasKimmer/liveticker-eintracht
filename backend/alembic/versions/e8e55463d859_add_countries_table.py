"""add_countries_table

Revision ID: e8e55463d859
Revises: 982704fc3022
Create Date: 2026-02-27 15:10:02.611485

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "e8e55463d859"
down_revision: Union[str, None] = "982704fc3022"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "countries",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("code", sa.String(3), nullable=True),
        sa.Column("flag_url", sa.String(255), nullable=True),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.add_column("teams", sa.Column("country_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "teams_country_id_fkey", "teams", "countries", ["country_id"], ["id"]
    )


def downgrade() -> None:
    op.execute('ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_country_id_fkey')
    op.drop_column("teams", "country_id")
    op.execute('DROP TABLE IF EXISTS countries')
