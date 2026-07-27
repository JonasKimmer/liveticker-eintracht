"""
Database Configuration
======================
SQLAlchemy Setup mit Connection Pooling für Production.

Features:
- Connection Pooling (performance)
- Automatic reconnect
- Session management
- Type hints

Author: Jonas Kimmer
Date: 2025-02-14
"""

import logging
from typing import Generator
from sqlalchemy import create_engine, event, Engine, text
from sqlalchemy.orm import sessionmaker, Session, declarative_base
from sqlalchemy.pool import QueuePool

from app.core.config import settings

# Logger
logger = logging.getLogger(__name__)

# SQLAlchemy Engine
engine = create_engine(
    settings.DATABASE_URL,
    poolclass=QueuePool,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_pre_ping=True,
    pool_recycle=300,  # recycle after 5 min – pgbouncer closes idle conns server-side
    pool_timeout=30,
    echo=settings.DEBUG,
)

# Session Factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

# Base Class for Models
Base = declarative_base()


# Event Listeners (für Logging & Debugging)
@event.listens_for(Engine, "connect")
def receive_connect(dbapi_conn, connection_record):
    """Log when connection is created."""
    logger.info("Database connection established")


@event.listens_for(Engine, "close")
def receive_close(dbapi_conn, connection_record):
    """Log when connection is closed."""
    logger.debug("Database connection closed")


# Dependency für FastAPI
def get_db() -> Generator[Session, None, None]:
    """
    Database Dependency für FastAPI Routes.

    Yields:
        Session: SQLAlchemy Session

    Usage:
        @app.get("/items")
        def get_items(db: Session = Depends(get_db)):
            return db.query(Item).all()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Health Check
def check_database_connection() -> bool:
    """
    Check if database is reachable.

    Returns:
        bool: True if connected, False otherwise
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Database health check: OK")
        return True
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return False
