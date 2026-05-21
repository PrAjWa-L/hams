from __future__ import annotations

from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.user import User
from app.services.base_repository import BaseRepository


class UserRepository(BaseRepository[User]):
    def __init__(self, db: AsyncSession) -> None:
        super().__init__(User, db)

    async def get_by_email(self, email: str) -> Optional[User]:
        result = await self.db.execute(
            select(User)
            .where(User.email == email.lower().strip())
            .where(User.is_deleted == False)  # noqa: E712
        )
        return result.scalar_one_or_none()

    async def get_by_emp_id(self, emp_id: str) -> Optional[User]:
        result = await self.db.execute(
            select(User)
            .where(User.emp_id == emp_id)
            .where(User.is_deleted == False)  # noqa: E712
        )
        return result.scalar_one_or_none()

    async def get_with_department(self, user_id) -> Optional[User]:
        result = await self.db.execute(
            select(User)
            .options(selectinload(User.department))
            .where(User.id == user_id)
            .where(User.is_deleted == False)  # noqa: E712
        )
        return result.scalar_one_or_none()

    async def email_exists(self, email: str, exclude_id=None) -> bool:
        query = select(User.id).where(
            User.email == email.lower().strip(),
            User.is_deleted == False,  # noqa: E712
        )
        if exclude_id:
            query = query.where(User.id != exclude_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none() is not None

    async def emp_id_exists(self, emp_id: str, exclude_id=None) -> bool:
        query = select(User.id).where(
            User.emp_id == emp_id,
            User.is_deleted == False,  # noqa: E712
        )
        if exclude_id:
            query = query.where(User.id != exclude_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none() is not None
