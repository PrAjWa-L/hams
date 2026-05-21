from __future__ import annotations

from typing import Sequence
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.core.logging import get_logger
from app.core.storage import delete_file, get_presigned_url, upload_file
from app.models.document import Document
from app.services.audit_service import AuditService

logger = get_logger(__name__)

ALLOWED_MIME_TYPES = {
    "image/jpeg", "image/png", "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB


class DocumentService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.audit = AuditService(db)

    async def upload(
        self,
        *,
        entity_type: str,
        entity_id: UUID,
        file_data,
        filename: str,
        content_type: str,
        doc_type: str,
        uploaded_by_id: UUID,
    ) -> Document:
        if content_type not in ALLOWED_MIME_TYPES:
            from app.core.exceptions import BadRequestException
            raise BadRequestException(
                detail=f"File type '{content_type}' not allowed. "
                       f"Allowed: PDF, JPG, PNG, WEBP, DOC, DOCX"
            )

        object_path = upload_file(
            data=file_data,
            filename=filename,
            content_type=content_type,
            folder=f"{entity_type}s/{entity_id}",
        )

        doc = Document(
            entity_type=entity_type,
            entity_id=entity_id,
            doc_type=doc_type,
            filename=filename,
            file_url=object_path,
            mime_type=content_type,
            uploaded_by_id=uploaded_by_id,
        )
        self.db.add(doc)
        await self.db.flush()
        await self.db.refresh(doc)

        await self.audit.log(
            actor_id=uploaded_by_id,
            entity_type=entity_type,
            entity_id=entity_id,
            action="document_upload",
            after_state={"filename": filename, "doc_type": doc_type},
        )
        logger.info("document_uploaded", entity=entity_type, entity_id=str(entity_id))
        return doc

    async def list_for_entity(
        self, entity_type: str, entity_id: UUID
    ) -> Sequence[Document]:
        result = await self.db.execute(
            select(Document)
            .where(
                Document.entity_type == entity_type,
                Document.entity_id == entity_id,
            )
            .order_by(Document.created_at.desc())
        )
        return result.scalars().all()

    async def get_download_url(self, doc_id: UUID, expires: int = 3600) -> str:
        result = await self.db.execute(
            select(Document).where(Document.id == doc_id)
        )
        doc = result.scalar_one_or_none()
        if not doc:
            raise NotFoundException(detail="Document not found")
        return get_presigned_url(doc.file_url, expires_seconds=expires)

    async def delete(self, doc_id: UUID, actor_id: UUID) -> None:
        result = await self.db.execute(
            select(Document).where(Document.id == doc_id)
        )
        doc = result.scalar_one_or_none()
        if not doc:
            raise NotFoundException(detail="Document not found")

        delete_file(doc.file_url)
        await self.db.delete(doc)
        await self.db.flush()

        await self.audit.log(
            actor_id=actor_id,
            entity_type=doc.entity_type,
            entity_id=doc.entity_id,
            action="document_delete",
            before_state={"filename": doc.filename},
        )
