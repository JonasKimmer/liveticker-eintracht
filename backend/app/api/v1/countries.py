"""
Countries Router
================
Endpunkte für Länderdaten (CRUD).
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.utils.http_errors import handle_integrity_error
from app.repositories.country_repository import CountryRepository
from app.schemas.country import CountryCreate, CountryResponse

router = APIRouter(prefix="/countries", tags=["Countries"])


@router.get(
    "",
    response_model=list[CountryResponse],
    response_model_by_alias=True,
    summary="List all countries",
)
def get_countries(
    skip: int = Query(0, ge=0),
    limit: int = Query(300, ge=1, le=500),
    db: Session = Depends(get_db),
) -> list[CountryResponse]:
    return CountryRepository(db).get_all(skip=skip, limit=limit)


@router.get(
    "/{countryId}",
    response_model=CountryResponse,
    response_model_by_alias=True,
    summary="Get a single country",
)
def get_country(
    countryId: int,
    db: Session = Depends(get_db),
) -> CountryResponse:
    country = CountryRepository(db).get_by_id(countryId)
    if not country:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Country not found"
        )
    return country


@router.post(
    "",
    response_model=CountryResponse,
    response_model_by_alias=True,
    status_code=status.HTTP_201_CREATED,
    summary="Create or update a country (upsert by name)",
)
def upsert_country(
    data: CountryCreate,
    db: Session = Depends(get_db),
) -> CountryResponse:
    with handle_integrity_error(f"Country '{data.name}' already exists with conflicting data."):
        return CountryRepository(db).upsert(data)