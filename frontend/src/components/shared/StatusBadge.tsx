import { cn } from '@/lib/utils'
import {
  STATUS_COLORS, STATUS_LABELS,
  ONBOARDING_STATUS_COLORS, ROLE_COLORS, ROLE_LABELS,
} from '@/lib/utils'
import type { AssetStatus, OnboardingStatus, Role } from '@/types'

export function AssetStatusBadge({ status }: { status: AssetStatus }) {
  return (
    <span className={cn(STATUS_COLORS[status])}>
      {STATUS_LABELS[status]}
    </span>
  )
}

export function OnboardingStatusBadge({ status }: { status: OnboardingStatus }) {
  const labels: Record<OnboardingStatus, string> = {
    draft: 'Draft',
    pending_hr_approval: 'Pending HR',
    pending_coo_approval: 'Pending COO',
    pending_approval: 'Pending Approval',  // legacy
    approved: 'Approved',
    rejected: 'Rejected',
    in_progress: 'In Progress',
    completed: 'Completed',
  }
  return (
    <span className={cn(ONBOARDING_STATUS_COLORS[status])}>
      {labels[status] ?? status}
    </span>
  )
}

export function RoleBadge({ role }: { role: Role }) {
  return (
    <span className={cn(ROLE_COLORS[role])}>
      {ROLE_LABELS[role]}
    </span>
  )
}