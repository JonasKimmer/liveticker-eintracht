-- ============================================================
-- Migration 001: ScorePlay Media Queue
-- Nur nötig wenn create_all NICHT verwendet wird.
-- Normalfall: FastAPI Server starten → Tabelle wird automatisch angelegt.
-- ============================================================

CREATE TABLE IF NOT EXISTS media_queue (
    id             SERIAL PRIMARY KEY,
    media_id       BIGINT UNIQUE NOT NULL,
    name           TEXT,
    thumbnail_url  TEXT,
    compressed_url TEXT,
    original_url   TEXT,
    event_id       BIGINT,
    status         TEXT NOT NULL DEFAULT 'pending',
    description    TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_queue_status     ON media_queue (status);
CREATE INDEX IF NOT EXISTS idx_media_queue_created_at ON media_queue (created_at DESC);

-- ticker_entries um image_url erweitern
-- (create_all legt nur neue Tabellen an, keine neuen Spalten → hier manuell)
ALTER TABLE ticker_entries
    ADD COLUMN IF NOT EXISTS image_url TEXT;
