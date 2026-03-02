import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories.country_repository import CountryRepository
from app.schemas.country import CountryCreate, CountryResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/countries", tags=["Countries"])


@router.get(
    "/",
    response_model=list[CountryResponse],
    summary="List all countries",
)
def get_countries(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(
        300, ge=1, le=500, description="Maximum number of records to return"
    ),
    db: Session = Depends(get_db),
) -> list[CountryResponse]:
    return CountryRepository(db).get_all(skip=skip, limit=limit)


@router.post(
    "/",
    response_model=CountryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create or update a country (upsert by name)",
)
def upsert_country(
    data: CountryCreate,
    db: Session = Depends(get_db),
) -> CountryResponse:
    """
    Idempotent upsert – safe to call repeatedly from n8n import workflows.
    Matches on `name` (unique). Updates `code` and `flag_url` if already exists.
    """
    try:
        return CountryRepository(db).upsert(data)
    except IntegrityError:
        logger.exception("IntegrityError upserting country: %s", data.name)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Country '{data.name}' already exists with conflicting data.",
        )
