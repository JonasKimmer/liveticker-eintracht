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
    "",
    response_model=PaginatedSeasonResponse,
    response_model_by_alias=True,
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
    "/{seasonId}",
    response_model=SeasonResponse,
    response_model_by_alias=True,
    summary="Get a single season",
)
def get_season(
    seasonId: int,
    db: Session = Depends(get_db),
) -> SeasonResponse:
    season = SeasonRepository(db).get_by_id(seasonId)
    if not season:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Season not found"
        )
    return season


@router.post(
    "",
    response_model=SeasonResponse,
    response_model_by_alias=True,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new season",
)
def create_season(
    data: SeasonCreate,
    db: Session = Depends(get_db),
) -> SeasonResponse:
    try:
        return SeasonRepository(db).create(data)
    except IntegrityError:
        logger.exception("IntegrityError creating season: %s", data.title)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A season with conflicting data already exists.",
        )


@router.put(
    "/{seasonId}",
    response_model=SeasonResponse,
    response_model_by_alias=True,
    summary="Update an existing season",
)
def update_season(
    seasonId: int,
    data: SeasonUpdate,
    db: Session = Depends(get_db),
) -> SeasonResponse:
    if not data.model_fields_set:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Request body must contain at least one field to update.",
        )
    try:
        updated = SeasonRepository(db).update(seasonId, data)
    except IntegrityError:
        logger.exception("IntegrityError updating season id=%s", seasonId)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Update would violate a unique constraint.",
        )
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Season not found"
        )
    return updated


@router.delete(
    "/{seasonId}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a season",
)
def delete_season(
    seasonId: int,
    db: Session = Depends(get_db),
) -> None:
    if not SeasonRepository(db).delete(seasonId):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Season not found"
        )
