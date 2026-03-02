from sqlalchemy.orm import Session
from app.models.country import Country
from app.schemas.country import CountryCreate


class CountryRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_all(self, skip: int = 0, limit: int = 300) -> list[Country]:
        return self.db.query(Country).offset(skip).limit(limit).all()

    def get_by_id(self, country_id: int) -> Country | None:
        return self.db.query(Country).filter(Country.id == country_id).first()

    def get_by_name(self, name: str) -> Country | None:
        return self.db.query(Country).filter(Country.name == name).first()

    def create(self, country: CountryCreate) -> Country:
        db_country = Country(**country.model_dump())
        self.db.add(db_country)
        self.db.commit()
        self.db.refresh(db_country)
        return db_country

    def upsert(self, country: CountryCreate) -> Country:
        existing = self.get_by_name(country.name)
        if existing:
            existing.code = country.code
            existing.flag_url = country.flag_url
            self.db.commit()
            self.db.refresh(existing)
            return existing
        return self.create(country)
