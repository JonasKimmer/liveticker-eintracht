-- ========================================
-- TEAMS (von API-Football /teams)
-- ========================================
CREATE TABLE teams (
    id SERIAL PRIMARY KEY,
    external_id INT UNIQUE NOT NULL,     -- team.id (z.B. 169)
    name VARCHAR(100) NOT NULL,          -- team.name
    code VARCHAR(10),                    -- team.code (z.B. "EIN")
    logo_url VARCHAR(255),               -- team.logo
    country VARCHAR(100),                -- team.country
    founded INT,                         -- team.founded
    venue_name VARCHAR(100),             -- venue.name
    venue_capacity INT,                  -- venue.capacity
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ========================================
-- MATCHES (von API-Football /fixtures)
-- ========================================
CREATE TABLE matches (
    id SERIAL PRIMARY KEY,
    external_id INT UNIQUE NOT NULL,     -- fixture.id (z.B. 1388506)
    home_team_id INT REFERENCES teams(id),
    away_team_id INT REFERENCES teams(id),
    match_date TIMESTAMP NOT NULL,       -- fixture.date
    status VARCHAR(20) DEFAULT 'NS',     -- fixture.status.short (NS, LIVE, FT)
    league_id INT,                       -- league.id (78 = Bundesliga)
    league_name VARCHAR(100),            -- league.name
    season INT,                          -- league.season (2025)
    round VARCHAR(100),                  -- league.round ("Regular Season - 23")
    venue_name VARCHAR(100),             -- venue.name
    referee VARCHAR(100),                -- fixture.referee
    score_home INT DEFAULT 0,            -- goals.home
    score_away INT DEFAULT 0,            -- goals.away
    halftime_home INT,                   -- score.halftime.home
    halftime_away INT,                   -- score.halftime.away
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_matches_date ON matches(match_date);
CREATE INDEX idx_matches_status ON matches(status);

-- ========================================
-- EVENTS (von API-Football /fixtures events)
-- ========================================
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    match_id INT REFERENCES matches(id) ON DELETE CASCADE,
    minute INT NOT NULL,                 -- time.elapsed
    extra_time INT,                      -- time.extra
    team_id INT REFERENCES teams(id),    -- team.id
    player_id INT,                       -- player.id
    player_name VARCHAR(100),            -- player.name
    assist_id INT,                       -- assist.id
    assist_name VARCHAR(100),            -- assist.name
    type VARCHAR(50) NOT NULL,           -- type (Goal, Card, subst)
    detail VARCHAR(100),                 -- detail (Normal Goal, Yellow Card, etc.)
    comments TEXT,                       -- comments
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_events_match ON events(match_id, minute);
CREATE INDEX idx_events_type ON events(type);

-- ========================================
-- PLAYERS (von API-Football /players)
-- ========================================
CREATE TABLE players (
    id SERIAL PRIMARY KEY,
    external_id INT UNIQUE NOT NULL,     -- player.id
    name VARCHAR(100) NOT NULL,          -- player.name
    firstname VARCHAR(100),              -- player.firstname
    lastname VARCHAR(100),               -- player.lastname
    age INT,                             -- player.age
    nationality VARCHAR(100),            -- player.nationality
    height VARCHAR(10),                  -- player.height
    weight VARCHAR(10),                  -- player.weight
    photo_url VARCHAR(255),              -- player.photo
    created_at TIMESTAMP DEFAULT NOW()
);

-- ========================================
-- PLAYER STATISTICS (von /players statistics)
-- ========================================
CREATE TABLE player_statistics (
    id SERIAL PRIMARY KEY,
    player_id INT REFERENCES players(id),
    match_id INT REFERENCES matches(id),
    team_id INT REFERENCES teams(id),
    position VARCHAR(50),                -- games.position
    minutes INT,                         -- games.minutes
    rating DECIMAL(3,1),                 -- games.rating
    shots_total INT,                     -- shots.total
    shots_on_target INT,                 -- shots.on
    goals INT,                           -- goals.total
    assists INT,                         -- goals.assists
    passes_total INT,                    -- passes.total
    passes_key INT,                      -- passes.key
    tackles_total INT,                   -- tackles.total
    dribbles_attempts INT,               -- dribbles.attempts
    dribbles_success INT,                -- dribbles.success
    fouls_drawn INT,                     -- fouls.drawn
    fouls_committed INT,                 -- fouls.committed
    cards_yellow INT,                    -- cards.yellow
    cards_red INT,                       -- cards.red
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_player_stats_match ON player_statistics(match_id);

-- ========================================
-- MATCH STATISTICS (von /fixtures/statistics)
-- ========================================
CREATE TABLE match_statistics (
    id SERIAL PRIMARY KEY,
    match_id INT REFERENCES matches(id) ON DELETE CASCADE,
    team_id INT REFERENCES teams(id),
    shots_on_goal INT,                   -- Shots on Goal
    shots_off_goal INT,                  -- Shots off Goal
    total_shots INT,                     -- Total Shots
    blocked_shots INT,                   -- Blocked Shots
    corner_kicks INT,                    -- Corner Kicks
    offsides INT,                        -- Offsides
    ball_possession INT,                 -- Ball Possession (%)
    yellow_cards INT,                    -- Yellow Cards
    red_cards INT,                       -- Red Cards
    goalkeeper_saves INT,                -- Goalkeeper Saves
    total_passes INT,                    -- Total passes
    passes_accurate INT,                 -- Passes accurate
    fouls INT,                           -- Fouls
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_match_stats ON match_statistics(match_id, team_id);

-- ========================================
-- STANDINGS (von /standings)
-- ========================================
CREATE TABLE standings (
    id SERIAL PRIMARY KEY,
    team_id INT REFERENCES teams(id),
    league_id INT,
    season INT,
    rank INT,                            -- rank
    points INT,                          -- points
    goals_diff INT,                      -- goalsDiff
    form VARCHAR(20),                    -- form (WDLWW)
    games_played INT,                    -- all.played
    games_win INT,                       -- all.win
    games_draw INT,                      -- all.draw
    games_lose INT,                      -- all.lose
    goals_for INT,                       -- all.goals.for
    goals_against INT,                   -- all.goals.against
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_standings ON standings(league_id, season, rank);

-- ========================================
-- TICKER ENTRIES (generierte Texte)
-- ========================================
CREATE TABLE ticker_entries (
    id SERIAL PRIMARY KEY,
    match_id INT REFERENCES matches(id) ON DELETE CASCADE,
    event_id INT REFERENCES events(id) ON DELETE SET NULL,
    minute INT NOT NULL,
    text TEXT NOT NULL,
    mode VARCHAR(20) NOT NULL,           -- 'auto', 'hybrid', 'manual'
    style VARCHAR(20),                   -- 'neutral', 'euphorisch', 'kritisch'
    language VARCHAR(5) DEFAULT 'de',    -- 'de', 'en', 'es', 'ja'
    llm_model VARCHAR(50),               -- 'gpt-4', 'claude-sonnet-4'
    prompt_used TEXT,                    -- Für Evaluation
    approved_by INT,                     -- User-ID (später)
    created_at TIMESTAMP DEFAULT NOW(),
    published_at TIMESTAMP
);

CREATE INDEX idx_ticker_match ON ticker_entries(match_id, minute DESC);

-- ========================================
-- PROMPT TEMPLATES (Few-Shot-Beispiele)
-- ========================================
CREATE TABLE prompt_templates (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,     -- 'goal', 'card', 'subst'
    style VARCHAR(20) NOT NULL,          -- 'neutral', 'euphorisch', 'kritisch'
    system_prompt TEXT NOT NULL,
    few_shot_examples JSONB,             -- Array von Beispielen
    created_at TIMESTAMP DEFAULT NOW()
);

-- ========================================
-- USERS (für später - Login)
-- ========================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100),
    password_hash VARCHAR(255),
    role VARCHAR(20) DEFAULT 'editor',   -- 'editor', 'admin'
    created_at TIMESTAMP DEFAULT NOW()
);

-- ========================================
-- TEST-DATEN (aus deinen API-Responses!)
-- ========================================

-- Teams einfügen
INSERT INTO teams (external_id, name, code, logo_url, country, founded, venue_name, venue_capacity) VALUES 
    (169, 'Eintracht Frankfurt', 'EIN', 'https://media.api-sports.io/football/teams/169.png', 'Germany', 1899, 'Frankfurt Arena', 58000),
    (157, 'Bayern München', 'BAY', 'https://media.api-sports.io/football/teams/157.png', 'Germany', 1900, 'Fußball Arena München', 75024),
    (165, 'Borussia Dortmund', 'DOR', 'https://media.api-sports.io/football/teams/165.png', 'Germany', 1909, 'BVB Stadion Dortmund', 81365);

-- Test-Match einfügen (Bayern vs Eintracht, Spieltag 23)
INSERT INTO matches (external_id, home_team_id, away_team_id, match_date, status, league_id, league_name, season, round, venue_name) 
VALUES 
    (1388506, 1, 2, '2026-02-21 14:30:00', 'NS', 78, 'Bundesliga', 2025, 'Regular Season - 23', 'Allianz Arena');

-- Standings einfügen (Top 3 aus deiner API)
INSERT INTO standings (team_id, league_id, season, rank, points, goals_diff, form, games_played, games_win, games_draw, games_lose, goals_for, goals_against)
VALUES
    (2, 78, 2025, 1, 54, 60, 'WDLWW', 21, 17, 3, 1, 79, 19),  -- Bayern
    (3, 78, 2025, 2, 51, 27, 'WWWWW', 22, 15, 6, 1, 47, 20),  -- Dortmund
    (1, 78, 2025, 8, 28, -5, 'DLLDL', 21, 7, 7, 7, 41, 46);   -- Eintrachts