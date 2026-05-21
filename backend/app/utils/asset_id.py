from __future__ import annotations

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession


async def generate_asset_id(db: AsyncSession, domain: str) -> str:
    """
    Generates sequential IDs:
      IT domain       → HAMS-IT-00001
      FACILITY domain → HAMS-FC-00001

    Uses a DB-level sequence per domain to prevent race conditions.
    """
    prefix_map = {"IT": "IT", "FACILITY": "FC"}
    prefix = prefix_map.get(domain.upper(), "XX")
    seq_name = f"asset_seq_{prefix.lower()}"

    # Create sequence if it doesn't exist (idempotent)
    await db.execute(
        text(f"CREATE SEQUENCE IF NOT EXISTS {seq_name} START 1 INCREMENT 1")
    )
    result = await db.execute(text(f"SELECT nextval('{seq_name}')"))
    seq_num = result.scalar_one()
    return f"HAMS-{prefix}-{seq_num:05d}"
