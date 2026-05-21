from __future__ import annotations

import io

import qrcode
from qrcode.image.pure import PyPNGImage

from app.core.logging import get_logger
from app.core.storage import upload_file

logger = get_logger(__name__)


def generate_and_upload_qr(asset_id: str, asset_uuid: str) -> str:
    """
    Generates a QR code PNG encoding the asset UUID,
    uploads it to MinIO, and returns the object path.
    """
    try:
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=10,
            border=4,
        )
        qr.add_data(asset_uuid)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")

        buffer = io.BytesIO()
        img.save(buffer)
        buffer.seek(0)

        object_path = upload_file(
            data=buffer,
            filename=f"{asset_id}.png",
            content_type="image/png",
            folder="qrcodes",
        )
        logger.info("qr_generated", asset_id=asset_id, path=object_path)
        return object_path

    except Exception as exc:
        logger.error("qr_generation_failed", asset_id=asset_id, error=str(exc))
        return ""
