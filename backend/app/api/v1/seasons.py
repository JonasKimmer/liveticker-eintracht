import logging
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories.season_repository import SeasonRepository
from app.schemas.season import (
    PaginatedSeasonResponse,
    SeasonCreate,
    SeasonResponse,
    SeasonUpdate,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/seasons", tags=["Seasons"])


@router.get(
    "/",
    response_model=PaginatedSeasonResponse,
    summary="List seasons (paginated)",
)
def get_seasons(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    order_by: Literal[
        "starts_at_asc", "starts_at_desc", "title_asc", "title_desc"
    ] = Query("starts_at_desc", description="Sort order"),
    db: Session = Depends(get_db),
) -> PaginatedSeasonResponse:
    return SeasonRepository(db).get_paginated(
        page=page, page_size=page_size, order_by=order_by
    )


@router.get(
    "/{season_id}",
    response_model=SeasonResponse,
    summary="Get a single season",
)
def get_season(
    season_id: int,
    db: Session = Depends(get_db),
) -> SeasonResponse:
    season = SeasonRepository(db).get_by_id(season_id)
    if not season:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Season not found"
        )
    return season


@router.post(
    "/",
    response_model=SeasonResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create or update a season (upsert by external_id)",
)
def create_season(
    data: SeasonCreate,
    db: Session = Depends(get_db),
) -> SeasonResponse:
    """
    Idempotent upsert – safe to call repeatedly from n8n import workflows.
    Matches on `external_id` if provided. Creates a new record otherwise.
    """
    try:
        season, _ = SeasonRepository(db).upsert(data)
        return season
    except IntegrityError:
        logger.exception("IntegrityError upserting season: %s", data.title)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A season with this external_id already exists with conflicting data.",
        )


@router.patch(
    "/{season_id}",
    response_model=SeasonResponse,
    summary="Partially update a season",
)
def update_season(
    season_id: int,
    data: SeasonUpdate,
    db: Session = Depends(get_db),
) -> SeasonResponse:
    """
    Partial update – only provided fields are changed.
    Fields like `source`, `external_id`, and `uid` are immutable via API.
    """
    if not data.model_fields_set:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Request body must contain at least one field to update.",
        )
    try:
        updated = SeasonRepository(db).update(season_id, data)
    except IntegrityError:
        logger.exception("IntegrityError updating season id=%s", season_id)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Update would violate a unique constraint.",
        )
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Season not found"
        )
    return updated
