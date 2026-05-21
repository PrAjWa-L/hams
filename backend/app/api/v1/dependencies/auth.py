from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.exceptions import UnauthorizedException
from app.core.redis import RedisKeys, get_redis
from app.core.security import decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)


class CurrentUser:
    """Lightweight principal — no DB hit on every request."""

    def __init__(self, user_id: str, role: str, email: str) -> None:
        self.id: UUID = UUID(user_id)
        self.role = role
        self.email = email

    def __repr__(self) -> str:
        return f"<CurrentUser id={self.id} role={self.role}>"


async def get_current_user(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None, Depends(bearer_scheme)
    ] = None,
    redis=Depends(get_redis),
) -> CurrentUser:
    if credentials is None:
        raise UnauthorizedException(detail="Authorization header missing")

    token = credentials.credentials
    payload = decode_access_token(token)

    # Check token blacklist (logout / password change)
    jti = payload.get("jti")
    if jti:
        blacklisted = await redis.get(RedisKeys.token_blacklist(jti))
        if blacklisted:
            raise UnauthorizedException(detail="Token has been revoked")

    user_id = payload.get("sub")
    role = payload.get("role")
    email = payload.get("email", "")

    if not user_id or not role:
        raise UnauthorizedException(detail="Malformed token payload")

    return CurrentUser(user_id=user_id, role=role, email=email)


# Typed shortcut for route signatures
AuthUser = Annotated[CurrentUser, Depends(get_current_user)]
