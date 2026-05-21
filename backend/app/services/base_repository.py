from __future__ import annotations

from typing import Any, Dict, Generic, List, Optional, Sequence, Type, TypeVar
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import Base

ModelT = TypeVar("ModelT", bound=Base)


class BaseRepository(Generic[ModelT]):
    def __init__(self, model: Type[ModelT], db: AsyncSession) -> None:
        self.model = model
        self.db = db

    async def get(self, id: UUID) -> Optional[ModelT]:
        result = await self.db.execute(
            select(self.model).where(self.model.id == id)  # type: ignore[attr-defined]
        )
        return result.scalar_one_or_none()

    async def get_or_raise(self, id: UUID) -> ModelT:
        from app.core.exceptions import NotFoundException
        obj = await self.get(id)
        if obj is None:
            raise NotFoundException(
                detail=f"{self.model.__name__} with id '{id}' not found"
            )
        return obj

    async def list(
        self,
        *,
        offset: int = 0,
        limit: int = 20,
        filters: Optional[List[Any]] = None,
        order_by: Optional[Any] = None,
    ) -> tuple[Sequence[ModelT], int]:
        query = select(self.model)
        count_query = select(func.count()).select_from(self.model)

        if filters:
            for f in filters:
                query = query.where(f)
                count_query = count_query.where(f)

        if order_by is not None:
            query = query.order_by(order_by)

        total_result = await self.db.execute(count_query)
        total = total_result.scalar_one()

        query = query.offset(offset).limit(limit)
        result = await self.db.execute(query)
        return result.scalars().all(), total

    async def create(self, **kwargs: Any) -> ModelT:
        obj = self.model(**kwargs)
        self.db.add(obj)
        await self.db.flush()
        await self.db.refresh(obj)
        return obj

    async def update(self, obj: ModelT, **kwargs: Any) -> ModelT:
        for key, value in kwargs.items():
            setattr(obj, key, value)
        self.db.add(obj)
        await self.db.flush()
        await self.db.refresh(obj)
        return obj

    async def delete(self, obj: ModelT) -> None:
        await self.db.delete(obj)
        await self.db.flush()

    async def soft_delete(self, obj: ModelT) -> ModelT:
        from datetime import datetime, timezone
        setattr(obj, "is_deleted", True)
        setattr(obj, "deleted_at", datetime.now(timezone.utc))
        self.db.add(obj)
        await self.db.flush()
        return obj
