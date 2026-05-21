from __future__ import annotations

from typing import Any, Optional

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.logging import get_logger

logger = get_logger(__name__)


# ── Exception hierarchy ───────────────────────────────────────

class HAMSException(Exception):
    status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR
    error_code: str = "INTERNAL_ERROR"

    def __init__(
        self,
        detail: str = "An unexpected error occurred",
        error_code: Optional[str] = None,
        extra: Optional[dict[str, Any]] = None,
    ) -> None:
        self.detail = detail
        if error_code:
            self.error_code = error_code
        self.extra = extra or {}
        super().__init__(detail)


class BadRequestException(HAMSException):
    status_code = status.HTTP_400_BAD_REQUEST
    error_code = "BAD_REQUEST"


class UnauthorizedException(HAMSException):
    status_code = status.HTTP_401_UNAUTHORIZED
    error_code = "UNAUTHORIZED"


class ForbiddenException(HAMSException):
    status_code = status.HTTP_403_FORBIDDEN
    error_code = "FORBIDDEN"


class NotFoundException(HAMSException):
    status_code = status.HTTP_404_NOT_FOUND
    error_code = "NOT_FOUND"


class ConflictException(HAMSException):
    status_code = status.HTTP_409_CONFLICT
    error_code = "CONFLICT"


class UnprocessableException(HAMSException):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    error_code = "UNPROCESSABLE"


class ServiceUnavailableException(HAMSException):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    error_code = "SERVICE_UNAVAILABLE"


# ── Response builder ──────────────────────────────────────────

def _error_response(
    status_code: int,
    error_code: str,
    detail: str,
    extra: Optional[dict] = None,
) -> JSONResponse:
    body: dict[str, Any] = {
        "data": None,
        "error": {
            "code": error_code,
            "message": detail,
        },
    }
    if extra:
        body["error"]["extra"] = extra
    return JSONResponse(status_code=status_code, content=body)


# ── Handlers ─────────────────────────────────────────────────

def register_exception_handlers(app: FastAPI) -> None:

    @app.exception_handler(HAMSException)
    async def hams_exception_handler(
        request: Request, exc: HAMSException
    ) -> JSONResponse:
        logger.warning(
            "application_exception",
            error_code=exc.error_code,
            detail=exc.detail,
            path=str(request.url),
        )
        return _error_response(
            exc.status_code, exc.error_code, exc.detail, exc.extra or None
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(
        request: Request, exc: StarletteHTTPException
    ) -> JSONResponse:
        return _error_response(exc.status_code, "HTTP_ERROR", str(exc.detail))

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        errors = [
            {"loc": e["loc"], "msg": e["msg"], "type": e["type"]}
            for e in exc.errors()
        ]
        return _error_response(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "VALIDATION_ERROR",
            "Request validation failed",
            {"errors": errors},
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(
        request: Request, exc: Exception
    ) -> JSONResponse:
        logger.exception(
            "unhandled_exception",
            path=str(request.url),
            exc_info=exc,
        )
        return _error_response(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "INTERNAL_ERROR",
            "An unexpected error occurred",
        )
