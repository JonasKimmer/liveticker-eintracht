"""squash_fresh_db

Revision ID: 0000_squash_fresh_db
Revises:
Create Date: 2026-03-24 00:00:00.000000

Single base migration that creates the entire schema from scratch.
Use this instead of replaying the full migration history on a new database.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0000_squash_fresh_db'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # -------------------------------------------------------------------------
    # 1. competitions
    # -------------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS competitions (
            id                          SERIAL PRIMARY KEY,
            external_id                 INTEGER UNIQUE,
            uid                         UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
            sport                       VARCHAR(20)  NOT NULL DEFAULT 'Football',
            title                       VARCHAR(100),
            localized_title             JSONB,
            short_title                 VARCHAR(20),
            logo_url                    VARCHAR(500),
            matchcenter_image_url       VARCHAR(500),
            has_standings_per_matchday  BOOLEAN NOT NULL DEFAULT FALSE,
            hidden                      BOOLEAN NOT NULL DEFAULT FALSE,
            position                    INTEGER NOT NULL DEFAULT 1,
            source                      VARCHAR(20)  NOT NULL DEFAULT 'partner',
            created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        )
    """)

    # -------------------------------------------------------------------------
    # 2. countries
    # -------------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS countries (
            id         SERIAL PRIMARY KEY,
            name       VARCHAR(100) NOT NULL UNIQUE,
            code       VARCHAR(10),
            flag_url   VARCHAR(500),
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        )
    """)

    # -------------------------------------------------------------------------
    # 3. media_queue
    # -------------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS media_queue (
            id              SERIAL PRIMARY KEY,
            media_id        BIGINT NOT NULL UNIQUE,
            name            TEXT,
            thumbnail_url   TEXT,
            compressed_url  TEXT,
            original_url    TEXT,
            event_id        BIGINT,
            status          TEXT NOT NULL DEFAULT 'pending',
            description     TEXT,
            created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        )
    """)

    # -------------------------------------------------------------------------
    # 4. seasons
    # -------------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS seasons (
            id          SERIAL PRIMARY KEY,
            external_id INTEGER UNIQUE,
            uid         UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
            sport       VARCHAR(20)  NOT NULL DEFAULT 'Football',
            title       VARCHAR(100) NOT NULL,
            short_title VARCHAR(20),
            starts_at   DATE,
            ends_at     DATE,
            source      VARCHAR(20)  NOT NULL DEFAULT 'partner',
            created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        )
    """)

    # -------------------------------------------------------------------------
    # 5. style_references
    # -------------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS style_references (
            id          SERIAL PRIMARY KEY,
            match_day   INTEGER,
            match_label VARCHAR(100),
            league      VARCHAR(50),
            event_type  VARCHAR(50) NOT NULL,
            minute      INTEGER,
            extra_time  INTEGER,
            text        TEXT        NOT NULL,
            instance    VARCHAR(20) NOT NULL DEFAULT 'ef_whitelabel',
            created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    """)

    # -------------------------------------------------------------------------
    # 6. teams  (depends on countries)
    # -------------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS teams (
            id              SERIAL PRIMARY KEY,
            external_id     INTEGER UNIQUE,
            uid             UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
            sport           VARCHAR(20)  NOT NULL DEFAULT 'Football',
            name            VARCHAR(100) NOT NULL,
            initials        VARCHAR(10),
            short_name      VARCHAR(100),
            category        JSONB,
            logo_url        VARCHAR(500),
            is_partner_team BOOLEAN NOT NULL DEFAULT FALSE,
            position        INTEGER NOT NULL DEFAULT 0,
            hidden          BOOLEAN NOT NULL DEFAULT FALSE,
            source          VARCHAR(20)  NOT NULL DEFAULT 'partner',
            country_id      INTEGER REFERENCES countries(id) ON DELETE SET NULL,
            created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        )
    """)

    # -------------------------------------------------------------------------
    # 7. competition_teams  (depends on seasons, competitions, teams)
    # -------------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS competition_teams (
            id             SERIAL PRIMARY KEY,
            uid            UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
            season_id      INTEGER NOT NULL REFERENCES seasons(id)      ON DELETE CASCADE,
            competition_id INTEGER NOT NULL REFERENCES competitions(id)  ON DELETE CASCADE,
            team_id        INTEGER NOT NULL REFERENCES teams(id)         ON DELETE CASCADE,
            created_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_competition_team UNIQUE (season_id, competition_id, team_id)
        )
    """)

    # -------------------------------------------------------------------------
    # 8. matches  (depends on seasons, competitions, teams)
    # -------------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS matches (
            id                      SERIAL PRIMARY KEY,
            external_id             INTEGER UNIQUE,
            uid                     UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
            sport                   VARCHAR(20)  NOT NULL DEFAULT 'Football',
            season_id               INTEGER REFERENCES seasons(id)      ON DELETE SET NULL,
            competition_id          INTEGER REFERENCES competitions(id)  ON DELETE SET NULL,
            home_team_id            INTEGER REFERENCES teams(id)         ON DELETE SET NULL,
            away_team_id            INTEGER REFERENCES teams(id)         ON DELETE SET NULL,
            home_score              INTEGER,
            away_score              INTEGER,
            matchday                INTEGER,
            matchday_title          JSONB,
            title                   VARCHAR(200),
            localized_title         JSONB,
            starts_at               TIMESTAMP WITH TIME ZONE,
            ends_at                 TIMESTAMP WITH TIME ZONE,
            venue                   VARCHAR(100),
            city                    VARCHAR(100),
            match_state             VARCHAR(30),
            match_phase             VARCHAR(30),
            minute                  INTEGER,
            is_scheduled            BOOLEAN NOT NULL DEFAULT FALSE,
            is_kickoff_confirmed    BOOLEAN NOT NULL DEFAULT FALSE,
            number_of_goal_scorers  INTEGER,
            number_of_viewers       INTEGER,
            team_home_jersey        JSONB,
            team_away_jersey        JSONB,
            broadcasts              JSONB,
            source                  VARCHAR(20)  NOT NULL DEFAULT 'partner',
            created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        )
    """)

    # -------------------------------------------------------------------------
    # 9. players  (depends on teams)
    # -------------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS players (
            id                    SERIAL PRIMARY KEY,
            external_id           INTEGER UNIQUE,
            sport                 VARCHAR(20)  NOT NULL DEFAULT 'Football',
            team_id               INTEGER REFERENCES teams(id) ON DELETE SET NULL,
            first_name            VARCHAR(100),
            last_name             VARCHAR(100),
            short_name            VARCHAR(100),
            display_name          VARCHAR(100),
            known_name            VARCHAR(100),
            position              VARCHAR(30),
            birthday              DATE,
            birthplace            VARCHAR(100),
            weight                DOUBLE PRECISION,
            height                DOUBLE PRECISION,
            jersey_number         INTEGER,
            country               VARCHAR(100),
            joined_on             DATE,
            signing_date          DATE,
            image_url             VARCHAR(500),
            person_hero_image_url VARCHAR(500),
            video_url             VARCHAR(500),
            profile               TEXT,
            hidden                BOOLEAN NOT NULL DEFAULT FALSE,
            statistics            JSONB,
            created_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        )
    """)

    # -------------------------------------------------------------------------
    # 10. events  (depends on matches)
    # -------------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS events (
            id               SERIAL PRIMARY KEY,
            external_id      INTEGER,
            source_id        VARCHAR(100),
            match_id         INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
            sport            VARCHAR(20),
            position         INTEGER,
            time             INTEGER,
            time_additional  INTEGER,
            event_type       VARCHAR(50),
            phase            VARCHAR(50),
            description      TEXT,
            html_description TEXT,
            image_url        VARCHAR(255),
            video_url        VARCHAR(255),
            source           VARCHAR(20) NOT NULL DEFAULT 'partner',
            created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        )
    """)

    # -------------------------------------------------------------------------
    # 11. lineups  (depends on matches, teams)
    # -------------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS lineups (
            id                  SERIAL PRIMARY KEY,
            match_id            INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
            team_id             INTEGER NOT NULL REFERENCES teams(id)   ON DELETE CASCADE,
            player_id           INTEGER,
            player_name         VARCHAR(200),
            jersey_number       INTEGER,
            status              VARCHAR(10) NOT NULL DEFAULT 'Start',
            formation_place     INTEGER,
            formation_position  INTEGER,
            position            VARCHAR(20),
            number_of_goals     INTEGER DEFAULT 0,
            has_yellow_card     BOOLEAN DEFAULT FALSE,
            has_red_card        BOOLEAN DEFAULT FALSE,
            is_substituted      BOOLEAN DEFAULT FALSE,
            formation           VARCHAR(20),
            created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    """)

    # -------------------------------------------------------------------------
    # 12. match_statistics  (depends on matches, teams)
    # -------------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS match_statistics (
            id                              SERIAL PRIMARY KEY,
            match_id                        INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
            team_id                         INTEGER NOT NULL REFERENCES teams(id)   ON DELETE CASCADE,
            possession_percentage           NUMERIC(5,1),
            total_pass                      INTEGER,
            accurate_pass                   INTEGER,
            duel_won                        INTEGER,
            duel_lost                       INTEGER,
            air_duel_won                    INTEGER,
            air_duel_lost                   INTEGER,
            blocked_pass                    INTEGER,
            total_offside                   INTEGER,
            corner_taken                    INTEGER,
            goal_scoring_attempt            INTEGER,
            goal_on_target_scoring_attempt  INTEGER,
            fouls                           INTEGER,
            yellow_cards                    INTEGER,
            crosses_in_match                INTEGER,
            crosses_accurate                INTEGER,
            total_crosses                   INTEGER,
            formation_used                  VARCHAR(20),
            created_at                      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            CONSTRAINT uq_match_statistic UNIQUE (match_id, team_id)
        )
    """)

    # -------------------------------------------------------------------------
    # 13. media_clips  (depends on matches)
    # -------------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS media_clips (
            id            SERIAL PRIMARY KEY,
            match_id      INTEGER REFERENCES matches(id) ON DELETE SET NULL,
            vid           VARCHAR(100),
            video_url     TEXT NOT NULL,
            thumbnail_url TEXT,
            title         TEXT,
            player_name   TEXT,
            team_name     VARCHAR(200),
            source        VARCHAR(50) DEFAULT 'bundesliga',
            published     BOOLEAN NOT NULL DEFAULT FALSE,
            created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    """)

    # -------------------------------------------------------------------------
    # 14. player_statistics  (depends on matches, teams, players)
    # -------------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS player_statistics (
            id                 SERIAL PRIMARY KEY,
            match_id           INTEGER NOT NULL  REFERENCES matches(id) ON DELETE CASCADE,
            team_id            INTEGER           REFERENCES teams(id)   ON DELETE CASCADE,
            player_id          INTEGER           REFERENCES players(id) ON DELETE SET NULL,
            position           VARCHAR(30),
            minutes            INTEGER,
            rating             DOUBLE PRECISION,
            shots_total        INTEGER,
            shots_on_target    INTEGER,
            goals              INTEGER DEFAULT 0,
            assists            INTEGER DEFAULT 0,
            passes_total       INTEGER,
            passes_key         INTEGER,
            tackles_total      INTEGER,
            dribbles_attempts  INTEGER,
            dribbles_success   INTEGER,
            fouls_drawn        INTEGER,
            fouls_committed    INTEGER,
            cards_yellow       INTEGER DEFAULT 0,
            cards_red          INTEGER DEFAULT 0,
            created_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            CONSTRAINT uq_player_statistic UNIQUE (match_id, player_id)
        )
    """)

    # -------------------------------------------------------------------------
    # 15. standings  (depends on seasons, competitions, matches, teams)
    # -------------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS standings (
            id             SERIAL PRIMARY KEY,
            season_id      INTEGER NOT NULL REFERENCES seasons(id)      ON DELETE CASCADE,
            competition_id INTEGER NOT NULL REFERENCES competitions(id)  ON DELETE CASCADE,
            match_id       INTEGER          REFERENCES matches(id)       ON DELETE SET NULL,
            team_id        INTEGER NOT NULL REFERENCES teams(id)         ON DELETE CASCADE,
            matchday       INTEGER,
            position       INTEGER,
            played         INTEGER,
            won            INTEGER,
            drawn          INTEGER,
            lost           INTEGER,
            goals_for      INTEGER,
            goals_against  INTEGER,
            points         INTEGER,
            created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            CONSTRAINT uq_standing UNIQUE (season_id, competition_id, team_id)
        )
    """)

    # -------------------------------------------------------------------------
    # 16. synthetic_events  (depends on matches)
    # -------------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS synthetic_events (
            id         SERIAL PRIMARY KEY,
            match_id   INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
            type       VARCHAR(50),
            minute     INTEGER,
            data       JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    """)

    # -------------------------------------------------------------------------
    # 17. ticker_entries  (depends on matches, events, synthetic_events)
    # -------------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS ticker_entries (
            id                 SERIAL PRIMARY KEY,
            match_id           INTEGER NOT NULL REFERENCES matches(id)          ON DELETE CASCADE,
            event_id           INTEGER          REFERENCES events(id)           ON DELETE SET NULL,
            synthetic_event_id INTEGER          REFERENCES synthetic_events(id) ON DELETE SET NULL,
            text               TEXT        NOT NULL,
            style              VARCHAR(50),
            icon               VARCHAR(50),
            llm_model          VARCHAR(100),
            status             VARCHAR(20) NOT NULL DEFAULT 'draft',
            source             VARCHAR(20) NOT NULL DEFAULT 'ai',
            minute             INTEGER,
            phase              VARCHAR(50),
            image_url          TEXT,
            video_url          TEXT,
            created_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        )
    """)

    # =========================================================================
    # Indexes
    # =========================================================================

    # competitions
    op.execute("CREATE INDEX IF NOT EXISTS ix_competitions_id          ON competitions (id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_competitions_external_id ON competitions (external_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_competitions_uid         ON competitions (uid)")

    # countries
    op.execute("CREATE INDEX IF NOT EXISTS ix_countries_id   ON countries (id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_countries_name ON countries (name)")

    # seasons
    op.execute("CREATE INDEX IF NOT EXISTS ix_seasons_id          ON seasons (id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_seasons_external_id ON seasons (external_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_seasons_uid         ON seasons (uid)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_seasons_title       ON seasons (title)")

    # teams
    op.execute("CREATE INDEX IF NOT EXISTS ix_teams_id          ON teams (id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_teams_external_id ON teams (external_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_teams_uid         ON teams (uid)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_teams_name        ON teams (name)")

    # competition_teams
    op.execute("CREATE INDEX IF NOT EXISTS ix_competition_teams_id  ON competition_teams (id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_competition_teams_uid ON competition_teams (uid)")

    # matches
    op.execute("CREATE INDEX IF NOT EXISTS ix_matches_id          ON matches (id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_matches_external_id ON matches (external_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_matches_uid         ON matches (uid)")

    # players
    op.execute("CREATE INDEX IF NOT EXISTS ix_players_id          ON players (id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_players_external_id ON players (external_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_players_team_id     ON players (team_id)")

    # events
    op.execute("CREATE INDEX IF NOT EXISTS ix_events_match_id ON events (match_id)")

    # media_clips  — partial unique index on vid (NULL allowed multiple times)
    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS uq_media_clips_vid
            ON media_clips (vid)
         WHERE vid IS NOT NULL
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_media_clips_match_id ON media_clips (match_id)")

    # standings
    op.execute("CREATE INDEX IF NOT EXISTS ix_standings_team_id ON standings (team_id)")

    # synthetic_events
    op.execute("CREATE INDEX IF NOT EXISTS ix_synthetic_events_type ON synthetic_events (type)")

    # ticker_entries
    op.execute("CREATE INDEX IF NOT EXISTS ix_ticker_entries_match_id ON ticker_entries (match_id)")


def downgrade() -> None:
    # Drop in reverse dependency order
    op.execute("DROP TABLE IF EXISTS ticker_entries     CASCADE")
    op.execute("DROP TABLE IF EXISTS synthetic_events   CASCADE")
    op.execute("DROP TABLE IF EXISTS standings          CASCADE")
    op.execute("DROP TABLE IF EXISTS player_statistics  CASCADE")
    op.execute("DROP TABLE IF EXISTS media_clips        CASCADE")
    op.execute("DROP TABLE IF EXISTS match_statistics   CASCADE")
    op.execute("DROP TABLE IF EXISTS lineups            CASCADE")
    op.execute("DROP TABLE IF EXISTS events             CASCADE")
    op.execute("DROP TABLE IF EXISTS players            CASCADE")
    op.execute("DROP TABLE IF EXISTS matches            CASCADE")
    op.execute("DROP TABLE IF EXISTS competition_teams  CASCADE")
    op.execute("DROP TABLE IF EXISTS teams              CASCADE")
    op.execute("DROP TABLE IF EXISTS style_references   CASCADE")
    op.execute("DROP TABLE IF EXISTS seasons            CASCADE")
    op.execute("DROP TABLE IF EXISTS media_queue        CASCADE")
    op.execute("DROP TABLE IF EXISTS countries          CASCADE")
    op.execute("DROP TABLE IF EXISTS competitions       CASCADE")
