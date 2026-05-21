from __future__ import annotations

import io
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dependencies.auth import AuthUser
from app.db.session import get_db
from app.schemas.asset import DocumentResponse
from app.schemas.response import APIResponse
from app.services.document_service import DocumentService

router = APIRouter(tags=["Documents"])

VALID_ENTITY_TYPES = ("asset", "vendor")
VALID_DOC_TYPES = ("invoice", "warranty_card", "amc_contract", "photo", "manual", "other")


@router.post(
    "",
    response_model=APIResponse[DocumentResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Upload a document and attach it to an entity",
)
async def upload_document(
    current_user: AuthUser,
    db: AsyncSession = Depends(get_db),
    entity_type: str = Form(..., description="asset or vendor"),
    entity_id: UUID = Form(...),
    doc_type: str = Form(default="other"),
    file: UploadFile = File(...),
):
    from app.core.exceptions import BadRequestException

    if entity_type not in VALID_ENTITY_TYPES:
        raise BadRequestException(
            detail=f"entity_type must be one of: {', '.join(VALID_ENTITY_TYPES)}"
        )
    if doc_type not in VALID_DOC_TYPES:
        raise BadRequestException(
            detail=f"doc_type must be one of: {', '.join(VALID_DOC_TYPES)}"
        )

    content = await file.read()
    if len(content) > 20 * 1024 * 1024:
        raise BadRequestException(detail="File size must not exceed 20 MB")

    svc = DocumentService(db)
    doc = await svc.upload(
        entity_type=entity_type,
        entity_id=entity_id,
        file_data=io.BytesIO(content),
        filename=file.filename or "upload",
        content_type=file.content_type or "application/octet-stream",
        doc_type=doc_type,
        uploaded_by_id=current_user.id,
    )
    return APIResponse.ok(data=DocumentResponse.model_validate(doc))


@router.get(
    "/{doc_id}/download-url",
    response_model=APIResponse[dict],
    status_code=status.HTTP_200_OK,
    summary="Get a presigned download URL for a document (valid 1 hour)",
)
async def get_download_url(
    doc_id: UUID,
    current_user: AuthUser,
    db: AsyncSession = Depends(get_db),
):
    svc = DocumentService(db)
    url = await svc.get_download_url(doc_id, expires=3600)
    return APIResponse.ok(data={"download_url": url, "expires_in": 3600})


@router.delete(
    "/{doc_id}",
    response_model=APIResponse[None],
    status_code=status.HTTP_200_OK,
    summary="Delete a document",
)
async def delete_document(
    doc_id: UUID,
    current_user: AuthUser,
    db: AsyncSession = Depends(get_db),
):
    svc = DocumentService(db)
    await svc.delete(doc_id, actor_id=current_user.id)
    return APIResponse.empty(message="Document deleted")
