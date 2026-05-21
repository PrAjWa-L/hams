from __future__ import annotations

from typing import Any, Generic, Optional, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class APIResponse(BaseModel, Generic[T]):
    data: Optional[T] = None
    message: Optional[str] = None
    meta: Optional[dict[str, Any]] = None

    @classmethod
    def ok(
        cls,
        data: T,
        message: Optional[str] = None,
        meta: Optional[dict[str, Any]] = None,
    ) -> "APIResponse[T]":
        return cls(data=data, message=message, meta=meta)

    @classmethod
    def empty(cls, message: str = "Success") -> "APIResponse[None]":
        return cls(data=None, message=message)
