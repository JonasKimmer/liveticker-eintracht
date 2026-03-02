"""refactor_competitions

Revision ID: refactor_competitions_001
Revises: 572d6038feb9
Create Date: 2026-03-02

Changes:
- competitions.uid: nullable=True → NOT NULL + DEFAULT gen_random_uuid()
- competitions.uid: add UNIQUE constraint
- competitions.external_id: add UNIQUE constraint
- competitions.localized_title: add JSONB column
- competitions.logo_url: extend to varchar(500)
- competitions.matchcenter_image_url: extend to varchar(500)
- competitions.updated_at: add column
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "04ab06bc6914"
down_revision: Union[str, None] = "572d6038feb9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Backfill NULL uids
    op.execute(
        """
        UPDATE competitions
        SET uid = gen_random_uuid()
        WHERE uid IS NULL
        """
    )

    # 2. uid NOT NULL
    op.alter_column("competitions", "uid", nullable=False)

    # 3. UNIQUE on uid
    try:
        op.create_unique_constraint("uq_competitions_uid", "competitions", ["uid"])
    except Exception:
        pass

    # 4. UNIQUE on external_id
    try:
        op.create_unique_constraint(
            "uq_competitions_external_id", "competitions", ["external_id"]
        )
    except Exception:
        pass

    # 5. Add localized_title JSONB
    op.add_column(
        "competitions",
        sa.Column("localized_title", postgresql.JSONB(), nullable=True),
    )

    # 6. Extend URL lengths
    op.alter_column(
        "competitions",
        "logo_url",
        type_=sa.String(500),
        existing_type=sa.String(255),
        existing_nullable=True,
    )
    op.alter_column(
        "competitions",
        "matchcenter_image_url",
        type_=sa.String(500),
        existing_type=sa.String(255),
        existing_nullable=True,
    )

    # 7. Add updated_at
    op.add_column(
        "competitions",
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("competitions", "updated_at")
    op.alter_column(
        "competitions",
        "matchcenter_image_url",
        type_=sa.String(255),
        existing_type=sa.String(500),
        existing_nullable=True,
    )
    op.alter_column(
        "competitions",
        "logo_url",
        type_=sa.String(255),
        existing_type=sa.String(500),
        existing_nullable=True,
    )
    op.drop_column("competitions", "localized_title")
    op.drop_constraint("uq_competitions_external_id", "competitions", type_="unique")
    op.drop_constraint("uq_competitions_uid", "competitions", type_="unique")
    op.alter_column("competitions", "uid", nullable=True)
