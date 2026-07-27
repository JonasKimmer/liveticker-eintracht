"""
schemas/base.py
===============
Gemeinsame Basisschemas (generische Paginierung, wiederverwendete Sub-Schemas).
"""

from math import ceil
from typing import Generic, Optional, TypeVar

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

ItemT = TypeVar("ItemT")


class LocalizedTitle(BaseModel):
    de: Optional[str] = Field(None, max_length=200)
    en: Optional[str] = Field(None, max_length=200)


class PaginatedResponse(BaseModel, Generic[ItemT]):
    """Generisches Paginierungs-Schema – wiederverwendet von Match, Event, etc."""

    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

    items: list[ItemT]
    total: int
    page: int
    page_size: int
    page_count: int
    has_previous_page: bool
    has_next_page: bool

    @classmethod
    def create(
        cls, items: list[ItemT], total: int, page: int, page_size: int
    ) -> "PaginatedResponse[ItemT]":
        page_count = ceil(total / page_size) if page_size > 0 else 0
        return cls(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            page_count=page_count,
            has_previous_page=page > 1,
            has_next_page=page < page_count,
        )
