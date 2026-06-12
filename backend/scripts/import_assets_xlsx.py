#!/usr/bin/env python3
"""
Import Epicorium Kochi assets and Cutis printers from Asset_Details.xlsx.

Usage (from repo root):
    python scripts/import_assets_xlsx.py /path/to/Asset_Details.xlsx

What it does:
  - Kochi sheet  → creates laptop/desktop assets for Epicorium Kochi
  - Printer sheet → creates printer assets linked to their tagged desktop via parent_asset_id
"""
from __future__ import annotations

import asyncio
import sys
import os
from uuid import uuid4

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import openpyxl
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.models.asset import Asset
from app.models.asset_category import AssetCategory


def s(val) -> str | None:
    if val is None:
        return None
    v = str(val).strip()
    return v if v.lower() not in ("", "nan", "none", "-") else None


async def generate_asset_id(db: AsyncSession, domain: str) -> str:
    prefix_map = {"IT": "IT", "FACILITY": "FC"}
    prefix = prefix_map.get(domain.upper(), "XX")
    seq_name = f"asset_seq_{prefix.lower()}"
    await db.execute(text(f"CREATE SEQUENCE IF NOT EXISTS {seq_name} START 1 INCREMENT 1"))
    result = await db.execute(text(f"SELECT nextval('{seq_name}')"))
    seq_num = result.scalar_one()
    return f"HAMS-{prefix}-{seq_num:05d}"


async def get_or_create_category(db: AsyncSession, name: str, domain: str) -> AssetCategory:
    result = await db.execute(
        select(AssetCategory).where(
            AssetCategory.name == name,
            AssetCategory.domain == domain,
        )
    )
    cat = result.scalar_one_or_none()
    if not cat:
        cat = AssetCategory(id=uuid4(), name=name, domain=domain)
        db.add(cat)
        await db.flush()
        print(f"  Created category: {name} ({domain})")
    return cat


async def import_kochi(db: AsyncSession, ws, category: AssetCategory) -> int:
    created = skipped = 0
    for row in ws.iter_rows(min_row=2, values_only=True):
        if not row[0]:
            continue
        name = s(row[1]) or s(row[4]) or f"Kochi-{row[0]}"
        hostname = s(row[4])
        mac = s(row[9])
        ip = s(row[10])
        ram = s(row[5])
        hdd = s(row[6])
        processor = s(row[7])
        generation = s(row[8])
        os_name = s(row[11])
        department = s(row[2])
        floor = s(row[3])

        # Dedup by hostname
        if hostname:
            dup = await db.execute(
                select(Asset.id).where(Asset.hostname == hostname, Asset.is_deleted == False)  # noqa
            )
            if dup.scalar_one_or_none():
                print(f"  SKIP  {name}  (hostname exists)")
                skipped += 1
                continue

        asset_id = await generate_asset_id(db, "IT")
        asset = Asset(
            id=uuid4(),
            asset_id=asset_id,
            name=name,
            category_id=category.id,
            hostname=hostname,
            mac_address=mac,
            ip_address=ip,
            ram=ram,
            hdd=hdd,
            processor=processor,
            generation=generation,
            os_name=os_name,
            floor=floor,
            label=department,
            notes=f"Location: Epicorium Kochi",
            status="available",
            is_deleted=False,
        )
        db.add(asset)
        await db.flush()
        print(f"  OK    {asset_id}  {name}")
        created += 1

    return created, skipped


async def import_printers(db: AsyncSession, ws, category: AssetCategory) -> tuple[int, int]:
    created = skipped = 0
    for row in ws.iter_rows(min_row=2, values_only=True):
        if not row[0]:
            continue

        printer_name = s(row[1]) or f"Printer-{row[0]}"
        department = s(row[2])
        floor = s(row[3])
        linked_hostname = s(row[4])   # desktop this printer is tagged to
        model = s(row[5])
        remarks = s(row[6])

        # Dedup by name
        dup = await db.execute(
            select(Asset.id).where(Asset.name == printer_name, Asset.is_deleted == False)  # noqa
        )
        if dup.scalar_one_or_none():
            print(f"  SKIP  {printer_name}  (already exists)")
            skipped += 1
            continue

        # Find the linked desktop asset by hostname
        parent_id = None
        if linked_hostname:
            parent_result = await db.execute(
                select(Asset.id).where(
                    Asset.hostname == linked_hostname,
                    Asset.is_deleted == False,  # noqa
                )
            )
            parent_id = parent_result.scalar_one_or_none()
            if not parent_id:
                print(f"  WARN  {printer_name} → desktop '{linked_hostname}' not found, creating unlinked")

        asset_id = await generate_asset_id(db, "IT")
        notes_parts = []
        if linked_hostname:
            notes_parts.append(f"Tagged to desktop: {linked_hostname}")
        if remarks:
            notes_parts.append(f"Remarks: {remarks}")

        asset = Asset(
            id=uuid4(),
            asset_id=asset_id,
            name=printer_name,
            category_id=category.id,
            model=model,
            floor=floor,
            label=department,
            parent_asset_id=parent_id,
            notes="\n".join(notes_parts) or None,
            status="available",
            is_deleted=False,
        )
        db.add(asset)
        await db.flush()
        link_info = f" → {linked_hostname}" if linked_hostname else ""
        print(f"  OK    {asset_id}  {printer_name}{link_info}  [{model}]")
        created += 1

    return created, skipped


async def main(xlsx_path: str) -> None:
    engine = create_async_engine(settings.DATABASE_URL, future=True)
    factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    wb = openpyxl.load_workbook(xlsx_path)

    async with factory() as db:
        laptop_cat = await get_or_create_category(db, "Laptop", "IT")
        printer_cat = await get_or_create_category(db, "Printer", "IT")

        # ── Kochi ─────────────────────────────────────────────
        print("\n=== Importing Epicorium Kochi ===")
        kochi_ws = wb["Kochin"]
        k_created, k_skipped = await import_kochi(db, kochi_ws, laptop_cat)

        # ── Printers ──────────────────────────────────────────
        print("\n=== Importing Cutis Printers ===")
        printer_ws = wb["Printer "]
        p_created, p_skipped = await import_printers(db, printer_ws, printer_cat)

        await db.commit()

    print(f"\n{'─'*55}")
    print(f"  Kochi    — Created: {k_created}  Skipped: {k_skipped}")
    print(f"  Printers — Created: {p_created}  Skipped: {p_skipped}")
    print(f"{'─'*55}\n")
    await engine.dispose()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/import_assets_xlsx.py <path_to_xlsx>")
        sys.exit(1)
    asyncio.run(main(sys.argv[1]))