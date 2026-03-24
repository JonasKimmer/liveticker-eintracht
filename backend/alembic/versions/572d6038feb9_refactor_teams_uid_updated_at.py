"""refactor_teams_uid_updated_at

Revision ID: refactor_teams_001
Revises: e8e55463d859
Create Date: 2026-03-02

Changes:
- teams.uid: nullable=True → NOT NULL + DEFAULT gen_random_uuid()
- teams.uid: add UNIQUE constraint if missing
- teams.updated_at: add column with server default now()
- teams.logo_url: extend to varchar(500)
- countries.flag_url: extend to varchar(500)
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "572d6038feb9"
down_revision: Union[str, None] = "e8e55463d859"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ------------------------------------------------------------------ #
    # 1. Backfill NULL uids before adding NOT NULL constraint              #
    # ------------------------------------------------------------------ #
    op.execute(
        """
        UPDATE teams
        SET uid = gen_random_uuid()
        WHERE uid IS NULL
        """
    )

    # 2. Make uid NOT NULL
    op.alter_column("teams", "uid", nullable=False)

    # 3. Add UNIQUE constraint on uid if not already present
    # (safe: IF NOT EXISTS is not supported for constraints – use try/except)
    try:
        op.create_unique_constraint("uq_teams_uid", "teams", ["uid"])
    except Exception:
        pass  # constraint already exists

    # ------------------------------------------------------------------ #
    # 4. Add updated_at column                                            #
    # ------------------------------------------------------------------ #
    op.add_column(
        "teams",
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )

    # ------------------------------------------------------------------ #
    # 5. Extend logo_url length                                           #
    # ------------------------------------------------------------------ #
    op.alter_column(
        "teams",
        "logo_url",
        type_=sa.String(500),
        existing_type=sa.String(255),
        existing_nullable=True,
    )

    op.alter_column(
        "countries",
        "flag_url",
        type_=sa.String(500),
        existing_type=sa.String(255),
        existing_nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "countries",
        "flag_url",
        type_=sa.String(255),
        existing_type=sa.String(500),
        existing_nullable=True,
    )
    op.alter_column(
        "teams",
        "logo_url",
        type_=sa.String(255),
        existing_type=sa.String(500),
        existing_nullable=True,
    )
    op.drop_column("teams", "updated_at")
    op.execute('ALTER TABLE teams DROP CONSTRAINT IF EXISTS uq_teams_uid')
    op.alter_column("teams", "uid", nullable=True)
