from __future__ import annotations

from typing import Annotated, Generic, List, Optional, TypeVar
from uuid import UUID

from fastapi import Depends, Query
from pydantic import BaseModel, Field

T = TypeVar("T")


class PaginationParams:
    def __init__(
        self,
        page: int = Query(default=1, ge=1, description="Page number"),
        page_size: int = Query(default=20, ge=1, le=100, description="Items per page"),
    ) -> None:
        self.page = page
        self.page_size = page_size

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size

    @property
    def limit(self) -> int:
        return self.page_size


class PageMeta(BaseModel):
    page: int
    page_size: int
    total: int
    total_pages: int
    has_next: bool
    has_prev: bool


class PagedResponse(BaseModel, Generic[T]):
    data: List[T]
    meta: PageMeta

    @classmethod
    def build(
        cls,
        items: List[T],
        total: int,
        params: PaginationParams,
    ) -> "PagedResponse[T]":
        total_pages = max(1, -(-total // params.page_size))
        return cls(
            data=items,
            meta=PageMeta(
                page=params.page,
                page_size=params.page_size,
                total=total,
                total_pages=total_pages,
                has_next=params.page < total_pages,
                has_prev=params.page > 1,
            ),
        )


Pagination = Annotated[PaginationParams, Depends(PaginationParams)]
