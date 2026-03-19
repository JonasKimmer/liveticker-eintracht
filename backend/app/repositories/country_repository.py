"""
CountryRepository
=================
Datenbankzugriff für Länderdaten (CRUD + Suche nach ISO-Code).
"""

import logging
from typing import Optional

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.country import Country
from app.schemas.country import CountryCreate

logger = logging.getLogger(__name__)


class CountryRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_all(self, skip: int = 0, limit: int = 300) -> list[Country]:
        return (
            self.db.query(Country)
            .order_by(Country.name)
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_by_id(self, country_id: int) -> Optional[Country]:
        return self.db.query(Country).filter(Country.id == country_id).first()

    def get_by_name(self, name: str) -> Optional[Country]:
        return self.db.query(Country).filter(Country.name == name).first()

    def upsert(self, data: CountryCreate) -> Country:
        """Insert or update by name (unique key)."""
        existing = self.get_by_name(data.name)
        if existing:
            existing.code = data.code
            existing.flag_url = str(data.flag_url) if data.flag_url else None
            try:
                self.db.commit()
                self.db.refresh(existing)
                logger.debug("Country updated: %s", existing.name)
            except IntegrityError:
                self.db.rollback()
                raise
            return existing

        country = Country(
            name=data.name,
            code=data.code,
            flag_url=str(data.flag_url) if data.flag_url else None,
        )
        self.db.add(country)
        try:
            self.db.commit()
            self.db.refresh(country)
            logger.debug("Country created: %s", country.name)
        except IntegrityError:
            self.db.rollback()
            raise
        return country
