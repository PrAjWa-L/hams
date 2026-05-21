from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from uuid import UUID

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings
from app.core.exceptions import UnauthorizedException

_ENCODING = "utf-8"
_ACCESS = "access"
_REFRESH = "refresh"


# ── Password ─────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(_ENCODING), bcrypt.gensalt()).decode(_ENCODING)


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(_ENCODING), hashed.encode(_ENCODING))


# ── Token creation ────────────────────────────────────────────

def create_access_token(
    subject: str | UUID,
    role: str,
    extra: Optional[dict[str, Any]] = None,
) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload: dict[str, Any] = {
        "sub": str(subject),
        "role": role,
        "type": _ACCESS,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(subject: str | UUID) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    payload: dict[str, Any] = {
        "sub": str(subject),
        "type": _REFRESH,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


# ── Token validation ──────────────────────────────────────────

def decode_token(token: str, expected_type: str = _ACCESS) -> dict[str, Any]:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
    except JWTError as exc:
        raise UnauthorizedException(detail="Invalid or expired token") from exc

    if payload.get("type") != expected_type:
        raise UnauthorizedException(detail=f"Expected {expected_type} token")

    return payload


def decode_access_token(token: str) -> dict[str, Any]:
    return decode_token(token, _ACCESS)


def decode_refresh_token(token: str) -> dict[str, Any]:
    return decode_token(token, _REFRESH)
