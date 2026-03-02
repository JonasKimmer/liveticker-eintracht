"""refactor_seasons

Revision ID: refactor_seasons_001
Revises: 04ab06bc6914
Create Date: 2026-03-02

Changes:
- seasons.uid: nullable=True → NOT NULL + DEFAULT gen_random_uuid()
- seasons.uid: add UNIQUE + index
- seasons.external_id: add UNIQUE + index
- seasons.title: add index
- seasons.updated_at: add column
- seasons.created_at: NOT NULL
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "5474bfd45705"
down_revision: Union[str, None] = "04ab06bc6914"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Backfill NULL uids
    op.execute(
        """
        UPDATE seasons
        SET uid = gen_random_uuid()
        WHERE uid IS NULL
        """
    )

    # 2. uid NOT NULL
    op.alter_column("seasons", "uid", nullable=False)

    # 3. UNIQUE + index on uid
    try:
        op.create_unique_constraint("uq_seasons_uid", "seasons", ["uid"])
    except Exception:
        pass
    try:
        op.create_index("ix_seasons_uid", "seasons", ["uid"])
    except Exception:
        pass

    # 4. UNIQUE + index on external_id
    try:
        op.create_unique_constraint(
            "uq_seasons_external_id", "seasons", ["external_id"]
        )
    except Exception:
        pass
    try:
        op.create_index("ix_seasons_external_id", "seasons", ["external_id"])
    except Exception:
        pass

    # 5. Index on id and title
    try:
        op.create_index("ix_seasons_id", "seasons", ["id"])
    except Exception:
        pass
    try:
        op.create_index("ix_seasons_title", "seasons", ["title"])
    except Exception:
        pass

    # 6. Add updated_at
    op.add_column(
        "seasons",
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )

    # 7. created_at NOT NULL
    op.alter_column("seasons", "created_at", nullable=False)


def downgrade() -> None:
    op.alter_column("seasons", "created_at", nullable=True)
    op.drop_column("seasons", "updated_at")
    op.drop_index("ix_seasons_title", "seasons")
    op.drop_index("ix_seasons_id", "seasons")
    op.drop_index("ix_seasons_external_id", "seasons")
    op.drop_constraint("uq_seasons_external_id", "seasons", type_="unique")
    op.drop_index("ix_seasons_uid", "seasons")
    op.drop_constraint("uq_seasons_uid", "seasons", type_="unique")
    op.alter_column("seasons", "uid", nullable=True)
