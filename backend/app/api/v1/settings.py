"""
Settings Router
===============
Endpunkte für konfigurierbare Systemeinstellungen (Key-Value-Paare).
Ermöglicht das Lesen und Überschreiben von Settings zur Laufzeit —
u.a. editierbare LLM-Stilbeschreibungen (style_desc_neutral, ...).
"""

from datetime import datetime
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories.setting_repository import SettingRepository

router = APIRouter(prefix="/settings", tags=["Settings"])


class SettingPatch(BaseModel):
    key: str
    value: str


class SettingResponse(BaseModel):
    key: str
    value: str
    updated_at: datetime | None = None


@router.get(
    "",
    response_model=dict[str, str],
    summary="Alle Settings abrufen",
)
def get_settings(db: Session = Depends(get_db)) -> dict[str, str]:
    """Gibt alle gespeicherten Settings als {key: value} zurück."""
    return SettingRepository(db).get_all()


@router.patch(
    "",
    response_model=SettingResponse,
    summary="Setting erstellen oder überschreiben",
)
def patch_setting(
    data: SettingPatch,
    db: Session = Depends(get_db),
) -> SettingResponse:
    """Legt einen neuen Key-Value-Eintrag an oder überschreibt einen bestehenden."""
    row = SettingRepository(db).upsert(data.key, data.value)
    return SettingResponse(key=row.key, value=row.value, updated_at=row.updated_at)
