"""
SettingRepository
=================
Datenbankzugriff für konfigurierbare Systemeinstellungen (Key-Value-Paare).
Wird u.a. für editierbare LLM-Stilbeschreibungen genutzt.
"""

from sqlalchemy.orm import Session
from app.models.setting import Setting


class SettingRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_all(self) -> dict[str, str]:
        """Gibt alle gespeicherten Settings als {key: value} Dict zurück."""
        rows = self.db.query(Setting).all()
        return {r.key: r.value for r in rows}

    def get(self, key: str) -> str | None:
        """Gibt den Wert eines einzelnen Keys zurück, oder None falls nicht vorhanden."""
        row = self.db.query(Setting).filter(Setting.key == key).first()
        return row.value if row else None

    def upsert(self, key: str, value: str) -> Setting:
        """Legt einen neuen Eintrag an oder überschreibt einen bestehenden."""
        row = self.db.query(Setting).filter(Setting.key == key).first()
        if row:
            row.value = value
        else:
            row = Setting(key=key, value=value)
            self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row
