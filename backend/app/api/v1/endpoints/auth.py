from __future__ import annotations

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies.auth import AuthUser, get_current_user
from app.core.exceptions import UnauthorizedException
from app.db.session import get_db
from app.core.redis import get_redis
from app.schemas.auth import (
    AccessTokenResponse,
    LoginRequest,
    RefreshRequest,
    TokenResponse,
)
from app.schemas.response import APIResponse
from app.schemas.user import PasswordChangeRequest, UserResponse
from app.services.auth_service import AuthService
from app.services.user_repository import UserRepository

router = APIRouter(tags=["Auth"])


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    return forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "")


@router.post(
    "/login",
    response_model=APIResponse[TokenResponse],
    status_code=status.HTTP_200_OK,
    summary="Login with email and password",
)
async def login(
    payload: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    svc = AuthService(db, redis)
    result = await svc.login(
        email=payload.email,
        password=payload.password,
        ip_address=_client_ip(request),
        user_agent=request.headers.get("User-Agent"),
    )
    return APIResponse.ok(
        data=TokenResponse(
            access_token=result["access_token"],
            refresh_token=result["refresh_token"],
            token_type="bearer",
            user=UserResponse.model_validate(result["user"]),
        )
    )


@router.post(
    "/refresh",
    response_model=APIResponse[AccessTokenResponse],
    status_code=status.HTTP_200_OK,
    summary="Get new access token using refresh token",
)
async def refresh(
    payload: RefreshRequest,
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    svc = AuthService(db, redis)
    result = await svc.refresh(payload.refresh_token)
    return APIResponse.ok(data=AccessTokenResponse(**result))


@router.post(
    "/logout",
    response_model=APIResponse[None],
    status_code=status.HTTP_200_OK,
    summary="Logout and invalidate session",
)
async def logout(
    request: Request,
    current_user: AuthUser,
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    svc = AuthService(db, redis)
    await svc.logout(
        user_id=current_user.id,
        ip_address=_client_ip(request),
    )
    return APIResponse.empty(message="Logged out successfully")


@router.get(
    "/me",
    response_model=APIResponse[UserResponse],
    status_code=status.HTTP_200_OK,
    summary="Get current authenticated user",
)
async def me(
    current_user: AuthUser,
    db: AsyncSession = Depends(get_db),
):
    repo = UserRepository(db)
    user = await repo.get_with_department(current_user.id)
    if not user:
        raise UnauthorizedException(detail="User not found")
    return APIResponse.ok(data=UserResponse.model_validate(user))


@router.post(
    "/change-password",
    response_model=APIResponse[None],
    status_code=status.HTTP_200_OK,
    summary="Change current user's password",
)
async def change_password(
    payload: PasswordChangeRequest,
    request: Request,
    current_user: AuthUser,
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    repo = UserRepository(db)
    user = await repo.get_with_department(current_user.id)
    if not user:
        raise UnauthorizedException(detail="User not found")

    svc = AuthService(db, redis)
    await svc.change_password(
        user=user,
        current_password=payload.current_password,
        new_password=payload.new_password,
        ip_address=_client_ip(request),
    )
    return APIResponse.empty(message="Password updated successfully")
