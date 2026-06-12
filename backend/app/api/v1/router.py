from fastapi import APIRouter

from app.api.v1.endpoints.asset_categories import router as categories_router
from app.api.v1.endpoints.assets import router as assets_router
from app.api.v1.endpoints.assignments import router as assignments_router
from app.api.v1.endpoints.audit_logs import router as audit_logs_router
from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.departments import router as departments_router
from app.api.v1.endpoints.documents import router as documents_router
from app.api.v1.endpoints.health import router as health_router
from app.api.v1.endpoints.maintenance import router as maintenance_router
from app.api.v1.endpoints.onboarding import router as onboarding_router
from app.api.v1.endpoints.users import router as users_router
from app.api.v1.endpoints.vendors import router as vendors_router

api_v1_router = APIRouter(prefix="/api/v1")

# System
api_v1_router.include_router(health_router, prefix="")

# Auth
api_v1_router.include_router(auth_router, prefix="/auth")

# Core domain — Phase 1
api_v1_router.include_router(users_router, prefix="/users")
api_v1_router.include_router(departments_router, prefix="/departments")

# Asset module — Phase 2
api_v1_router.include_router(categories_router, prefix="/asset-categories")
api_v1_router.include_router(vendors_router, prefix="/vendors")
api_v1_router.include_router(assets_router, prefix="/assets")
api_v1_router.include_router(documents_router, prefix="/documents")
api_v1_router.include_router(audit_logs_router, prefix="/audit-logs")

# Workflow module — Phase 3
api_v1_router.include_router(onboarding_router, prefix="/onboarding")
api_v1_router.include_router(assignments_router, prefix="/assignments")
api_v1_router.include_router(maintenance_router, prefix="/maintenance")