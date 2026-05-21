from __future__ import annotations

from typing import List, Optional, Sequence
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import ConflictException, NotFoundException
from app.core.logging import get_logger
from app.core.security import hash_password
from app.models.user import User
from app.schemas.user import UserCreateRequest, UserUpdateRequest
from app.services.audit_service import AuditService
from app.services.user_repository import UserRepository

logger = get_logger(__name__)


class UserService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = UserRepository(db)
        self.audit = AuditService(db)

    async def create(
        self,
        data: UserCreateRequest,
        actor_id: UUID,
    ) -> User:
        if await self.repo.email_exists(data.email):
            raise ConflictException(detail=f"Email '{data.email}' is already registered")
        if await self.repo.emp_id_exists(data.emp_id):
            raise ConflictException(detail=f"Employee ID '{data.emp_id}' already exists")

        user = User(
            emp_id=data.emp_id,
            full_name=data.full_name,
            email=data.email.lower().strip(),
            phone=data.phone,
            role=data.role,
            designation=data.designation,
            department_id=data.department_id,
            password_hash=hash_password(data.password),
            must_change_password=True,
        )
        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user)

        await self.audit.log(
            actor_id=actor_id,
            entity_type="user",
            entity_id=user.id,
            action="create",
            after_state={"emp_id": user.emp_id, "email": user.email, "role": user.role},
        )
        logger.info("user_created", user_id=str(user.id), emp_id=user.emp_id)
        return user

    async def get_by_id(self, user_id: UUID) -> User:
        result = await self.db.execute(
            select(User)
            .options(selectinload(User.department))
            .where(User.id == user_id, User.is_deleted == False)  # noqa: E712
        )
        user = result.scalar_one_or_none()
        if not user:
            raise NotFoundException(detail=f"User '{user_id}' not found")
        return user

    async def list_users(
        self,
        *,
        offset: int = 0,
        limit: int = 20,
        role: Optional[str] = None,
        department_id: Optional[UUID] = None,
        is_active: Optional[bool] = None,
        search: Optional[str] = None,
    ) -> tuple[Sequence[User], int]:
        from sqlalchemy import func, or_
        filters = [User.is_deleted == False]  # noqa: E712
        if role:
            filters.append(User.role == role)
        if department_id:
            filters.append(User.department_id == department_id)
        if is_active is not None:
            filters.append(User.is_active == is_active)
        if search:
            term = f"%{search}%"
            filters.append(
                or_(
                    User.full_name.ilike(term),
                    User.email.ilike(term),
                    User.emp_id.ilike(term),
                )
            )
        return await self.repo.list(
            offset=offset,
            limit=limit,
            filters=filters,
            order_by=User.full_name,
        )

    async def update(
        self,
        user_id: UUID,
        data: UserUpdateRequest,
        actor_id: UUID,
    ) -> User:
        user = await self.get_by_id(user_id)
        before = user.to_dict()

        if data.full_name is not None:
            user.full_name = data.full_name
        if data.phone is not None:
            user.phone = data.phone
        if data.designation is not None:
            user.designation = data.designation
        if data.department_id is not None:
            user.department_id = data.department_id
        if data.is_active is not None:
            user.is_active = data.is_active

        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user)

        await self.audit.log(
            actor_id=actor_id,
            entity_type="user",
            entity_id=user.id,
            action="update",
            before_state=before,
            after_state=user.to_dict(),
        )
        return user

    async def deactivate(self, user_id: UUID, actor_id: UUID) -> User:
        user = await self.get_by_id(user_id)
        before = {"is_active": user.is_active}
        user.is_active = False
        self.db.add(user)
        await self.db.flush()
        await self.audit.log(
            actor_id=actor_id,
            entity_type="user",
            entity_id=user.id,
            action="deactivate",
            before_state=before,
            after_state={"is_active": False},
        )
        logger.info("user_deactivated", user_id=str(user_id))
        return user
