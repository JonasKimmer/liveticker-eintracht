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
from typing import Generator, TypeVar

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError

logger = logging.getLogger(__name__)

T = TypeVar("T")


def require_or_404(obj: T | None, detail: str) -> T:
    """Wirft HTTP 404 wenn obj falsy ist, sonst wird obj zurückgegeben.

    Deckt beide Fälle ab:
    - Objekt-Lookup:  ``return require_or_404(repo.get(id), "X not found")``
    - Delete-Check:   ``require_or_404(repo.delete(id), "X not found")``
    """
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)
    return obj  # type: ignore[return-value]


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
