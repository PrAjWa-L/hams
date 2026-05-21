from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import UnauthorizedException, ForbiddenException
from app.core.logging import get_logger
from app.core.redis import RedisKeys
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    hash_password,
    verify_password,
)
from app.models.user import User
from app.services.audit_service import AuditService
from app.services.user_repository import UserRepository

logger = get_logger(__name__)


class AuthService:
    def __init__(self, db: AsyncSession, redis) -> None:
        self.db = db
        self.redis = redis
        self.user_repo = UserRepository(db)
        self.audit = AuditService(db)

    async def login(
        self,
        email: str,
        password: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> dict:
        user = await self.user_repo.get_by_email(email)

        if not user or not verify_password(password, user.password_hash):
            raise UnauthorizedException(detail="Invalid email or password")

        if not user.is_active:
            raise ForbiddenException(detail="Account is deactivated")

        # Reload with department eagerly loaded for serialization
        user = await self.user_repo.get_with_department(user.id)

        access_token = create_access_token(
            subject=user.id,
            role=user.role,
            extra={"email": user.email},
        )
        refresh_token = create_refresh_token(subject=user.id)

        await self.redis.setex(
            RedisKeys.session(str(user.id)),
            60 * 60 * 24 * 7,
            str(user.id),
        )

        await self.audit.log(
            actor_id=user.id,
            entity_type="user",
            entity_id=user.id,
            action="login",
            ip_address=ip_address,
            user_agent=user_agent,
        )

        logger.info("user_login", user_id=str(user.id), email=user.email)
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": user,
        }

    async def refresh(self, refresh_token: str) -> dict:
        payload = decode_refresh_token(refresh_token)
        user_id = payload.get("sub")

        user = await self.user_repo.get_with_department(UUID(user_id))
        if not user or not user.is_active:
            raise UnauthorizedException(detail="User not found or inactive")

        session = await self.redis.get(RedisKeys.session(str(user.id)))
        if not session:
            raise UnauthorizedException(detail="Session expired — please log in again")

        access_token = create_access_token(
            subject=user.id,
            role=user.role,
            extra={"email": user.email},
        )
        return {"access_token": access_token, "token_type": "bearer"}

    async def logout(
        self,
        user_id: UUID,
        ip_address: Optional[str] = None,
    ) -> None:
        await self.redis.delete(RedisKeys.session(str(user_id)))
        await self.audit.log(
            actor_id=user_id,
            entity_type="user",
            entity_id=user_id,
            action="logout",
            ip_address=ip_address,
        )
        logger.info("user_logout", user_id=str(user_id))

    async def change_password(
        self,
        user: User,
        current_password: str,
        new_password: str,
        ip_address: Optional[str] = None,
    ) -> None:
        if not verify_password(current_password, user.password_hash):
            raise UnauthorizedException(detail="Current password is incorrect")

        user.password_hash = hash_password(new_password)
        user.must_change_password = False
        self.db.add(user)

        await self.redis.delete(RedisKeys.session(str(user.id)))

        await self.audit.log(
            actor_id=user.id,
            entity_type="user",
            entity_id=user.id,
            action="password_change",
            ip_address=ip_address,
        )
        logger.info("password_changed", user_id=str(user.id))
