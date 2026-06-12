from __future__ import annotations

from enum import Enum
from functools import wraps
from typing import Callable, Optional, Set

from fastapi import Depends

from app.core.exceptions import ForbiddenException


class Role(str, Enum):
    HR = "hr"
    COO = "coo"
    IT_HEAD = "it_head"
    IT_TEAM = "it_team"
    MANAGEMENT = "management"
    EMPLOYEE = "employee"


class AssetDomain(str, Enum):
    IT = "IT"
    FACILITY = "FACILITY"
    ALL = "ALL"


# Role → allowed asset domains
ROLE_DOMAIN_MAP: dict[Role, AssetDomain] = {
    Role.HR: AssetDomain.ALL,
    Role.COO: AssetDomain.ALL,
    Role.IT_HEAD: AssetDomain.IT,
    Role.IT_TEAM: AssetDomain.IT,
    Role.MANAGEMENT: AssetDomain.FACILITY,
    Role.EMPLOYEE: AssetDomain.ALL,
}

# Permission constants
class Permission(str, Enum):
    # Asset
    ASSET_CREATE = "asset:create"
    ASSET_READ = "asset:read"
    ASSET_UPDATE = "asset:update"
    ASSET_RETIRE = "asset:retire"
    ASSET_TRANSFER = "asset:transfer"
    # Assignments
    ASSIGNMENT_CREATE = "assignment:create"
    ASSIGNMENT_ACKNOWLEDGE = "assignment:acknowledge"
    # Onboarding
    ONBOARDING_CREATE = "onboarding:create"
    ONBOARDING_APPROVE = "onboarding:approve"
    # Procurement
    PROCUREMENT_CREATE = "procurement:create"
    PROCUREMENT_APPROVE = "procurement:approve"
    # Maintenance log
    MAINTENANCE_LOG = "maintenance:log"
    # Reports
    REPORT_READ = "report:read"
    REPORT_EXPORT = "report:export"
    # Admin
    AUDIT_LOG_READ = "audit_log:read"
    USER_MANAGE = "user:manage"


ROLE_PERMISSIONS: dict[Role, Set[Permission]] = {
    Role.COO: {
        Permission.ASSET_CREATE,
        Permission.ASSET_READ,
        Permission.ASSET_UPDATE,
        Permission.ASSET_RETIRE,
        Permission.ASSET_TRANSFER,
        Permission.ONBOARDING_APPROVE,
        Permission.PROCUREMENT_APPROVE,
        Permission.MAINTENANCE_LOG,
        Permission.REPORT_READ,
        Permission.REPORT_EXPORT,
        Permission.AUDIT_LOG_READ,
        Permission.USER_MANAGE,
    },
    Role.HR: {
        Permission.ONBOARDING_CREATE,
        Permission.PROCUREMENT_CREATE,
        Permission.ASSET_READ,
        Permission.MAINTENANCE_LOG,
        Permission.USER_MANAGE,
    },
    Role.IT_HEAD: {
        Permission.ASSET_CREATE,
        Permission.ASSET_READ,
        Permission.ASSET_UPDATE,
        Permission.ASSET_RETIRE,
        Permission.ASSET_TRANSFER,
        Permission.ASSIGNMENT_CREATE,
        Permission.MAINTENANCE_LOG,
        Permission.REPORT_READ,
        Permission.REPORT_EXPORT,
        Permission.AUDIT_LOG_READ,
        Permission.USER_MANAGE,
    },
    Role.IT_TEAM: {
        Permission.ASSET_CREATE,
        Permission.ASSET_READ,
        Permission.ASSET_UPDATE,
        Permission.MAINTENANCE_LOG,
        Permission.USER_MANAGE,
    },
    Role.MANAGEMENT: {
        Permission.ASSET_CREATE,
        Permission.ASSET_READ,
        Permission.ASSET_UPDATE,
        Permission.ASSET_RETIRE,
        Permission.ASSET_TRANSFER,
        Permission.ASSIGNMENT_CREATE,
        Permission.MAINTENANCE_LOG,
        Permission.REPORT_READ,
        Permission.REPORT_EXPORT,
        Permission.AUDIT_LOG_READ,
        Permission.USER_MANAGE,
    },
    Role.EMPLOYEE: {
        Permission.ASSET_READ,
        Permission.ASSIGNMENT_ACKNOWLEDGE,
        Permission.MAINTENANCE_LOG,
    },
}


def has_permission(role: Role, permission: Permission) -> bool:
    return permission in ROLE_PERMISSIONS.get(role, set())


def get_allowed_domains(role: Role) -> AssetDomain:
    return ROLE_DOMAIN_MAP.get(role, AssetDomain.ALL)


def require_permissions(*permissions: Permission) -> Callable:
    """Dependency factory — inject into FastAPI route dependencies."""
    from app.api.v1.dependencies.auth import get_current_user

    async def _checker(current_user=Depends(get_current_user)):
        role = Role(current_user.role)
        for perm in permissions:
            if not has_permission(role, perm):
                raise ForbiddenException(
                    detail=f"Permission '{perm}' required",
                    error_code="PERMISSION_DENIED",
                )
        return current_user

    return _checker