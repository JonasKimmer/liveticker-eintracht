"""
HTTP-Fehler-Helfer
==================
Wiederverwendbare Utilities für häufige FastAPI-Fehlerpatterns.

Verwendung:
    with handle_integrity_error("A team with conflicting data already exists."):
        return TeamRepository(db).create(data)
"""

import logging
from contextlib import contextmanager
from typing import Generator

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError

logger = logging.getLogger(__name__)


@contextmanager
def handle_integrity_error(detail: str) -> Generator[None, None, None]:
    """Fängt SQLAlchemy IntegrityError und wirft HTTP 409 Conflict.

    Args:
        detail: Fehlermeldung die an den Client zurückgegeben wird.
    """
    try:
        yield
    except IntegrityError:
        logger.exception("IntegrityError: %s", detail)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=detail,
        )
