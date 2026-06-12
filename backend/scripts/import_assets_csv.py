#!/usr/bin/env python3
from __future__ import annotations

import asyncio
import re
import sys
import os
from uuid import uuid4

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pandas as pd
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.models.asset import Asset
from app.models.asset_category import AssetCategory


# ── Helpers ───────────────────────────────────────────────────────────────────

def clean_name(raw) -> str:
    return re.sub(r"\(null\)\s*$", "", str(raw)).strip()


def parse_serial(val) -> str | None:
    if not val or str(val).strip().lower() in ("", "nan", "n/a"):
        return None
    return str(val).strip()


def parse_storage(val) -> str | None:
    if not val or str(val).strip().lower() in ("", "nan"):
        return None
    m = re.search(r"Capacity:([\d.]+\s*GB)", str(val))
    return m.group(1).strip() if m else str(val)[:100]


def str_or_none(val) -> str | None:
    if not val or str(val).strip().lower() in ("", "nan"):
        return None
    return str(val).strip()


async def generate_asset_id(db: AsyncSession, domain: str) -> str:
    prefix_map = {"IT": "IT", "FACILITY": "FC"}
    prefix = prefix_map.get(domain.upper(), "XX")
    seq_name = f"asset_seq_{prefix.lower()}"
    await db.execute(text(f"CREATE SEQUENCE IF NOT EXISTS {seq_name} START 1 INCREMENT 1"))
    result = await db.execute(text(f"SELECT nextval('{seq_name}')"))
    seq_num = result.scalar_one()
    return f"HAMS-{prefix}-{seq_num:05d}"


# ── Main ──────────────────────────────────────────────────────────────────────

async def main(csv_path: str) -> None:
    engine = create_async_engine(settings.DATABASE_URL, future=True)
    factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    print(f"\nReading {csv_path} …")
    df = pd.read_csv(csv_path)
    print(f"Found {len(df)} rows\n")

    required = {"Endpoint Name", "IP Address", "Manufacturer", "Model"}
    missing = required - set(df.columns)
    if missing:
        print(f"ERROR: CSV missing columns: {missing}")
        sys.exit(1)

    async with factory() as db:
        # Resolve IT category
        result = await db.execute(
            select(AssetCategory).where(AssetCategory.domain == "IT").limit(1)
        )
        category = result.scalar_one_or_none()
        if not category:
            print("ERROR: No IT AssetCategory found in DB. Run the seed script first.")
            sys.exit(1)

        print(f"Using category: {category.name} (id={category.id})\n")

        created = skipped = errors = 0

        for idx, row in df.iterrows():
            row_num = int(idx) + 2
            name = clean_name(row.get("Endpoint Name", "")) or f"Imported-{row_num}"
            serial = parse_serial(row.get("BIOS Serial Number"))

            # Dedup by serial
            if serial:
                dup = await db.execute(
                    select(Asset.id).where(
                        Asset.serial_number == serial,
                        Asset.is_deleted == False,  # noqa: E712
                    )
                )
                if dup.scalar_one_or_none():
                    print(f"  SKIP  row {row_num:>4}  {name}  (serial {serial} exists)")
                    skipped += 1
                    continue

            # Dedup by hostname
            dup_host = await db.execute(
                select(Asset.id).where(
                    Asset.hostname == name,
                    Asset.is_deleted == False,  # noqa: E712
                )
            )
            if dup_host.scalar_one_or_none():
                print(f"  SKIP  row {row_num:>4}  {name}  (hostname exists)")
                skipped += 1
                continue

            av = str_or_none(row.get("Product Name"))
            av_ver = str_or_none(row.get("Product Version"))
            antivirus = f"{av} {av_ver}".strip() if av and av_ver else av

            notes_parts = []
            if u := str_or_none(row.get("User Name")):
                notes_parts.append(f"Last logged-in user: {u}")
            if v := str_or_none(row.get("OS Version")):
                notes_parts.append(f"OS Version: {v}")
            if c := str_or_none(row.get("Last Connected On")):
                notes_parts.append(f"Last connected: {c}")

            try:
                asset_id = await generate_asset_id(db, category.domain)
                asset = Asset(
                    id=uuid4(),
                    asset_id=asset_id,
                    name=name,
                    category_id=category.id,
                    brand=str_or_none(row.get("Manufacturer")),
                    model=str_or_none(row.get("Model")),
                    serial_number=serial,
                    hostname=name,
                    ip_address=str_or_none(row.get("IP Address")),
                    mac_address=str_or_none(row.get("MAC Address 1")),
                    os_name=str_or_none(row.get("OS Name")),
                    ram=str_or_none(row.get("Physical Memory")),
                    hdd=parse_storage(row.get("Storage")),
                    processor=str_or_none(row.get("Processor Name")),
                    antivirus=antivirus,
                    label=str_or_none(row.get("Group")),
                    notes="\n".join(notes_parts) or None,
                    status="available",
                    is_deleted=False,
                )
                db.add(asset)
                await db.flush()
                print(f"  OK    row {row_num:>4}  {asset_id}  {name}")
                created += 1
            except Exception as exc:
                await db.rollback()
                print(f"  ERROR row {row_num:>4}  {name}  → {exc}")
                errors += 1
                continue

        await db.commit()

    print(f"\n{'─'*50}")
    print(f"  Total : {len(df)}")
    print(f"  Created : {created}")
    print(f"  Skipped : {skipped}")
    print(f"  Errors  : {errors}")
    print(f"{'─'*50}\n")
    await engine.dispose()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/import_assets_csv.py <path_to_csv>")
        sys.exit(1)
    asyncio.run(main(sys.argv[1]))