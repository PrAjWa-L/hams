from __future__ import annotations

import io
import uuid
from pathlib import PurePosixPath
from typing import BinaryIO, Optional

from minio import Minio
from minio.error import S3Error

from app.core.config import settings
from app.core.exceptions import ServiceUnavailableException
from app.core.logging import get_logger

logger = get_logger(__name__)

_client: Optional[Minio] = None


def get_minio_client() -> Minio:
    global _client
    if _client is None:
        _client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_SECURE,
        )
    return _client


def ensure_bucket(bucket: str = settings.MINIO_BUCKET_ASSETS) -> None:
    client = get_minio_client()
    try:
        if not client.bucket_exists(bucket):
            client.make_bucket(bucket)
            logger.info("minio_bucket_created", bucket=bucket)
    except S3Error as exc:
        logger.error("minio_bucket_error", error=str(exc))
        raise ServiceUnavailableException("Storage service unavailable") from exc


def upload_file(
    data: BinaryIO,
    filename: str,
    content_type: str,
    folder: str = "documents",
    bucket: str = settings.MINIO_BUCKET_ASSETS,
) -> str:
    client = get_minio_client()
    ext = PurePosixPath(filename).suffix
    object_name = f"{folder}/{uuid.uuid4().hex}{ext}"

    try:
        data.seek(0, 2)
        size = data.tell()
        data.seek(0)

        client.put_object(
            bucket,
            object_name,
            data,
            length=size,
            content_type=content_type,
        )
        logger.info("minio_upload_success", object=object_name, size=size)
        return object_name
    except S3Error as exc:
        logger.error("minio_upload_failed", error=str(exc))
        raise ServiceUnavailableException("File upload failed") from exc


def get_presigned_url(
    object_name: str,
    bucket: str = settings.MINIO_BUCKET_ASSETS,
    expires_seconds: int = 3600,
) -> str:
    from datetime import timedelta

    client = get_minio_client()
    try:
        return client.presigned_get_object(
            bucket, object_name, expires=timedelta(seconds=expires_seconds)
        )
    except S3Error as exc:
        logger.error("minio_presign_failed", error=str(exc))
        raise ServiceUnavailableException("Could not generate file URL") from exc


def delete_file(
    object_name: str,
    bucket: str = settings.MINIO_BUCKET_ASSETS,
) -> None:
    client = get_minio_client()
    try:
        client.remove_object(bucket, object_name)
    except S3Error as exc:
        logger.error("minio_delete_failed", error=str(exc))
