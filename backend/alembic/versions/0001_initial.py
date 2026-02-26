"""initial schema for partner api

Revision ID: 0001_initial
Revises:
Create Date: 2026-02-26

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- TEAMS ---
    op.create_table(
        "teams",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("external_id", sa.Integer(), nullable=True),  # Partner API id
        sa.Column("uid", postgresql.UUID(), nullable=True),  # Partner API uId
        sa.Column("sport", sa.String(20), nullable=False, server_default="Football"),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("initials", sa.String(10), nullable=True),
        sa.Column("short_name", sa.String(100), nullable=True),
        sa.Column("logo_url", sa.String(255), nullable=True),
        sa.Column("is_partner_team", sa.Boolean(), server_default="false"),
        sa.Column("hidden", sa.Boolean(), server_default="false"),
        sa.Column(
            "source", sa.String(20), nullable=False, server_default="partner"
        ),  # 'partner' | 'api_sports'
        sa.Column(
            "created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()")
        ),
    )
    op.create_index("idx_teams_external_id", "teams", ["external_id"], unique=True)

    # --- SEASONS ---
    op.create_table(
        "seasons",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("external_id", sa.Integer(), nullable=True),
        sa.Column("uid", postgresql.UUID(), nullable=True),
        sa.Column("sport", sa.String(20), nullable=False, server_default="Football"),
        sa.Column("title", sa.String(100), nullable=False),
        sa.Column("short_title", sa.String(20), nullable=True),
        sa.Column("starts_at", sa.Date(), nullable=True),
        sa.Column("ends_at", sa.Date(), nullable=True),
        sa.Column("source", sa.String(20), nullable=False, server_default="partner"),
        sa.Column(
            "created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()")
        ),
    )

    # --- COMPETITIONS (= leagues) ---
    op.create_table(
        "competitions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("external_id", sa.Integer(), nullable=True),
        sa.Column("uid", postgresql.UUID(), nullable=True),
        sa.Column("sport", sa.String(20), nullable=False, server_default="Football"),
        sa.Column("title", sa.String(100), nullable=True),
        sa.Column("short_title", sa.String(20), nullable=True),
        sa.Column("logo_url", sa.String(255), nullable=True),
        sa.Column("matchcenter_image_url", sa.String(255), nullable=True),
        sa.Column("has_standings_per_matchday", sa.Boolean(), server_default="false"),
        sa.Column("hidden", sa.Boolean(), server_default="false"),
        sa.Column("position", sa.Integer(), server_default="1"),
        sa.Column("source", sa.String(20), nullable=False, server_default="partner"),
        sa.Column(
            "created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()")
        ),
    )

    # --- MATCHES ---
    op.create_table(
        "matches",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("external_id", sa.Integer(), nullable=True),
        sa.Column("uid", postgresql.UUID(), nullable=True),
        sa.Column("sport", sa.String(20), nullable=False, server_default="Football"),
        sa.Column(
            "season_id",
            sa.Integer(),
            sa.ForeignKey("seasons.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "competition_id",
            sa.Integer(),
            sa.ForeignKey("competitions.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "home_team_id",
            sa.Integer(),
            sa.ForeignKey("teams.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "away_team_id",
            sa.Integer(),
            sa.ForeignKey("teams.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("home_score", sa.Integer(), nullable=True),
        sa.Column("away_score", sa.Integer(), nullable=True),
        sa.Column("matchday", sa.Integer(), nullable=True),
        sa.Column("matchday_title", postgresql.JSONB(), nullable=True),  # localized
        sa.Column("starts_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("ends_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("venue", sa.String(100), nullable=True),
        sa.Column("city", sa.String(100), nullable=True),
        sa.Column(
            "match_state", sa.String(30), nullable=True
        ),  # Enum: Undefined, PreMatch, Live, FullTime, ...
        sa.Column(
            "match_phase", sa.String(30), nullable=True
        ),  # Enum: Undefined, FirstHalf, SecondHalf, ...
        sa.Column("is_scheduled", sa.Boolean(), server_default="false"),
        sa.Column("source", sa.String(20), nullable=False, server_default="partner"),
        sa.Column(
            "created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()")
        ),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=True),
    )
    op.create_index("idx_matches_external_id", "matches", ["external_id"])
    op.create_index("idx_matches_competition", "matches", ["competition_id"])
    op.create_index("idx_matches_matchday", "matches", ["competition_id", "matchday"])

    # --- EVENTS (LiveTicker) ---
    op.create_table(
        "events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("external_id", sa.Integer(), nullable=True),  # Partner API id
        sa.Column("source_id", sa.String(100), nullable=True),  # Partner API sourceId
        sa.Column(
            "match_id",
            sa.Integer(),
            sa.ForeignKey("matches.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("sport", sa.String(20), nullable=True),
        sa.Column("position", sa.Integer(), nullable=True),
        sa.Column("time", sa.Integer(), nullable=True),  # minute
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("html_description", sa.Text(), nullable=True),
        sa.Column("image_url", sa.String(255), nullable=True),
        sa.Column("video_url", sa.String(255), nullable=True),
        sa.Column("source", sa.String(20), nullable=False, server_default="partner"),
        sa.Column(
            "created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()")
        ),
    )
    op.create_index("idx_events_match_id", "events", ["match_id"])
    op.create_index("idx_events_source_id", "events", ["source_id"])

    # --- LINEUPS ---
    op.create_table(
        "lineups",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "match_id",
            sa.Integer(),
            sa.ForeignKey("matches.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("team_id", sa.Integer(), sa.ForeignKey("teams.id"), nullable=False),
        sa.Column("player_id", sa.Integer(), nullable=True),
        sa.Column("player_name", sa.String(100), nullable=True),
        sa.Column("number", sa.Integer(), nullable=True),
        sa.Column("position", sa.String(20), nullable=True),
        sa.Column("grid", sa.String(10), nullable=True),
        sa.Column("formation", sa.String(20), nullable=True),
        sa.Column("coach", sa.String(100), nullable=True),
        sa.Column("starter", sa.Boolean(), server_default="true"),
        sa.Column(
            "created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()")
        ),
    )
    op.create_index("idx_lineups_match", "lineups", ["match_id"])

    # --- MATCH STATISTICS ---
    op.create_table(
        "match_statistics",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "match_id",
            sa.Integer(),
            sa.ForeignKey("matches.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("team_id", sa.Integer(), sa.ForeignKey("teams.id"), nullable=False),
        sa.Column("shots_on_goal", sa.Integer(), nullable=True),
        sa.Column("shots_off_goal", sa.Integer(), nullable=True),
        sa.Column("total_shots", sa.Integer(), nullable=True),
        sa.Column("blocked_shots", sa.Integer(), nullable=True),
        sa.Column("fouls", sa.Integer(), nullable=True),
        sa.Column("corner_kicks", sa.Integer(), nullable=True),
        sa.Column("offsides", sa.Integer(), nullable=True),
        sa.Column("ball_possession", sa.Integer(), nullable=True),
        sa.Column("yellow_cards", sa.Integer(), nullable=True),
        sa.Column("red_cards", sa.Integer(), nullable=True),
        sa.Column("goalkeeper_saves", sa.Integer(), nullable=True),
        sa.Column("total_passes", sa.Integer(), nullable=True),
        sa.Column("passes_accurate", sa.Integer(), nullable=True),
        sa.Column(
            "created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()")
        ),
        sa.UniqueConstraint("match_id", "team_id", name="unique_match_team_stat"),
    )

    # --- PLAYER STATISTICS ---
    op.create_table(
        "player_statistics",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "match_id",
            sa.Integer(),
            sa.ForeignKey("matches.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("team_id", sa.Integer(), sa.ForeignKey("teams.id"), nullable=False),
        sa.Column("player_id", sa.Integer(), nullable=True),
        sa.Column("player_name", sa.String(100), nullable=True),
        sa.Column("minutes", sa.Integer(), nullable=True),
        sa.Column("position", sa.String(10), nullable=True),
        sa.Column("rating", sa.Numeric(3, 1), nullable=True),
        sa.Column("goals_total", sa.Integer(), nullable=True),
        sa.Column("assists", sa.Integer(), nullable=True),
        sa.Column("cards_yellow", sa.Integer(), nullable=True),
        sa.Column("cards_red", sa.Integer(), nullable=True),
        sa.Column(
            "created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()")
        ),
        sa.UniqueConstraint("match_id", "player_id", name="unique_match_player"),
    )

    # --- STANDINGS ---
    op.create_table(
        "standings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "season_id",
            sa.Integer(),
            sa.ForeignKey("seasons.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "competition_id",
            sa.Integer(),
            sa.ForeignKey("competitions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("team_id", sa.Integer(), sa.ForeignKey("teams.id"), nullable=False),
        sa.Column("matchday", sa.Integer(), nullable=True),
        sa.Column("position", sa.Integer(), nullable=True),
        sa.Column("played", sa.Integer(), nullable=True),
        sa.Column("won", sa.Integer(), nullable=True),
        sa.Column("drawn", sa.Integer(), nullable=True),
        sa.Column("lost", sa.Integer(), nullable=True),
        sa.Column("goals_for", sa.Integer(), nullable=True),
        sa.Column("goals_against", sa.Integer(), nullable=True),
        sa.Column("points", sa.Integer(), nullable=True),
        sa.Column(
            "created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()")
        ),
    )
    op.create_index(
        "idx_standings_lookup", "standings", ["season_id", "competition_id", "matchday"]
    )

    # --- TICKER ENTRIES ---
    op.create_table(
        "ticker_entries",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "match_id",
            sa.Integer(),
            sa.ForeignKey("matches.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "event_id",
            sa.Integer(),
            sa.ForeignKey("events.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("style", sa.String(50), nullable=True),
        sa.Column("icon", sa.String(50), nullable=True),
        sa.Column("llm_model", sa.String(100), nullable=True),
        sa.Column(
            "status", sa.String(20), nullable=False, server_default="draft"
        ),  # draft | published | rejected
        sa.Column(
            "source", sa.String(20), nullable=False, server_default="ai"
        ),  # ai | manual
        sa.Column(
            "created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()")
        ),
    )
    op.create_index("idx_ticker_match", "ticker_entries", ["match_id", "status"])

    # --- USER FAVORITES ---
    op.create_table(
        "user_favorites",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "team_id",
            sa.Integer(),
            sa.ForeignKey("teams.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()")
        ),
        sa.UniqueConstraint("team_id", name="unique_favorite_team"),
    )

    # --- SYNTHETIC EVENTS ---
    op.create_table(
        "synthetic_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "match_id",
            sa.Integer(),
            sa.ForeignKey("matches.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("type", sa.String(50), nullable=True),
        sa.Column("minute", sa.Integer(), nullable=True),
        sa.Column("data", postgresql.JSONB(), nullable=True),
        sa.Column(
            "created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()")
        ),
    )


def downgrade() -> None:
    op.drop_table("synthetic_events")
    op.drop_table("user_favorites")
    op.drop_table("ticker_entries")
    op.drop_table("standings")
    op.drop_table("player_statistics")
    op.drop_table("match_statistics")
    op.drop_table("lineups")
    op.drop_table("events")
    op.drop_table("matches")
    op.drop_table("competitions")
    op.drop_table("seasons")
    op.drop_table("teams")
