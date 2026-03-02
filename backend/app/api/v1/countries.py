import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories.country_repository import CountryRepository
from app.schemas.country import Country, CountryCreate

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/countries", tags=["countries"])


@router.get("/", response_model=list[Country])
def get_countries(skip: int = 0, limit: int = 300, db: Session = Depends(get_db)):
    return CountryRepository(db).get_all(skip=skip, limit=limit)


@router.get("/{country_id}", response_model=Country)
def get_country(country_id: int, db: Session = Depends(get_db)):
    country = CountryRepository(db).get_by_id(country_id)
    if not country:
        raise HTTPException(status_code=404, detail="Country not found")
    return country


@router.post("/", response_model=Country, status_code=201)
def create_country(country: CountryCreate, db: Session = Depends(get_db)):
    return CountryRepository(db).upsert(country)
