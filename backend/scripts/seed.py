#!/usr/bin/env python3
"""
Seed script — run once after first migration.

Usage (from repo root):
    docker compose exec api python scripts/seed.py

Creates:
  - 6 departments
  - Asset categories (IT + Facility)
  - One user per role with known default passwords
"""
from __future__ import annotations

import asyncio
import sys
import os

# Ensure app package is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.security import hash_password
from app.models.asset_category import AssetCategory
from app.models.department import Department
from app.models.user import User

# ── Seed data ─────────────────────────────────────────────────

DEPARTMENTS = [
    {"name": "Information Technology", "floor": "Ground Floor"},
    {"name": "Administration",         "floor": "1st Floor"},
    {"name": "Human Resources",        "floor": "1st Floor"},
    {"name": "Dermatology",            "floor": "2nd Floor"},
    {"name": "Diagnostics",            "floor": "2nd Floor"},
    {"name": "Operations",             "floor": "Ground Floor"},
]

ASSET_CATEGORIES = [
    # IT domain
    {"name": "Laptop",           "domain": "IT",       "icon": "laptop"},
    {"name": "Desktop",          "domain": "IT",       "icon": "desktop"},
    {"name": "Printer",          "domain": "IT",       "icon": "printer"},
    {"name": "Networking Device","domain": "IT",       "icon": "router"},
    {"name": "Phone",            "domain": "IT",       "icon": "phone"},
    {"name": "Accessory",        "domain": "IT",       "icon": "plug"},
    # Facility domain
    {"name": "Table",            "domain": "FACILITY", "icon": "table"},
    {"name": "Chair",            "domain": "FACILITY", "icon": "armchair"},
    {"name": "Sofa",             "domain": "FACILITY", "icon": "sofa"},
    {"name": "Cabinet",          "domain": "FACILITY", "icon": "archive"},
    {"name": "Medical Equipment","domain": "FACILITY", "icon": "stethoscope"},
    {"name": "Dermatology Machine","domain": "FACILITY","icon": "activity"},
    {"name": "Diagnostic Device","domain": "FACILITY", "icon": "cpu"},
]

# role → (emp_id, full_name, email, password, department_name)
USERS = [
    ("COO001",  "Chief Operating Officer", "coo@hospital.com",        "COO@hams2024!",  "Operations"),
    ("HR001",   "HR Manager",              "hr@hospital.com",          "HR@hams2024!",   "Human Resources"),
    ("ITHEAD01","IT Head",                 "it.head@hospital.com",     "IT@hams2024!",   "Information Technology"),
    ("IT001",   "IT Engineer",             "it.team@hospital.com",     "ITT@hams2024!",  "Information Technology"),
    ("MGMT001", "Facility Manager",        "facility@hospital.com",    "FAC@hams2024!",  "Administration"),
    ("EMP001",  "Sample Employee",         "employee@hospital.com",    "EMP@hams2024!",  "Dermatology"),
]

ROLE_MAP = {
    "COO001":   "coo",
    "HR001":    "hr",
    "ITHEAD01": "it_head",
    "IT001":    "it_team",
    "MGMT001":  "management",
    "EMP001":   "employee",
}


async def seed() -> None:
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    factory = async_sessionmaker(engine, expire_on_commit=False)

    async with factory() as db:
        async with db.begin():
            dept_map = await _seed_departments(db)
            await _seed_categories(db)
            await _seed_users(db, dept_map)

    await engine.dispose()
    print("\n✅  Seed complete.")
    print("\nDefault credentials:")
    for emp_id, name, email, pwd, _ in USERS:
        print(f"  {email:<35} password: {pwd}")


async def _seed_departments(db: AsyncSession) -> dict[str, Department]:
    from sqlalchemy import select
    dept_map: dict[str, Department] = {}
    for d in DEPARTMENTS:
        result = await db.execute(
            select(Department).where(Department.name == d["name"])
        )
        dept = result.scalar_one_or_none()
        if not dept:
            dept = Department(**d)
            db.add(dept)
            await db.flush()
            print(f"  + Department: {dept.name}")
        else:
            print(f"  ~ Department exists: {dept.name}")
        dept_map[dept.name] = dept
    return dept_map


async def _seed_categories(db: AsyncSession) -> None:
    from sqlalchemy import select
    for c in ASSET_CATEGORIES:
        result = await db.execute(
            select(AssetCategory).where(AssetCategory.name == c["name"])
        )
        cat = result.scalar_one_or_none()
        if not cat:
            db.add(AssetCategory(**c))
            print(f"  + Category: {c['name']} ({c['domain']})")
        else:
            print(f"  ~ Category exists: {c['name']}")


async def _seed_users(
    db: AsyncSession, dept_map: dict[str, Department]
) -> None:
    from sqlalchemy import select
    for emp_id, full_name, email, password, dept_name in USERS:
        result = await db.execute(
            select(User).where(User.email == email)
        )
        user = result.scalar_one_or_none()
        if not user:
            dept = dept_map.get(dept_name)
            db.add(User(
                emp_id=emp_id,
                full_name=full_name,
                email=email,
                password_hash=hash_password(password),
                role=ROLE_MAP[emp_id],
                department_id=dept.id if dept else None,
                must_change_password=False,
            ))
            print(f"  + User: {email} ({ROLE_MAP[emp_id]})")
        else:
            print(f"  ~ User exists: {email}")


if __name__ == "__main__":
    asyncio.run(seed())
