import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import type { AssetStatus, OnboardingStatus, Role } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date?: string | null): string {
  if (!date) return '—'
  try {
    return format(parseISO(date), 'dd MMM yyyy')
  } catch {
    return date
  }
}

export function formatDateTime(date?: string | null): string {
  if (!date) return '—'
  try {
    return format(parseISO(date), 'dd MMM yyyy, HH:mm')
  } catch {
    return date
  }
}

export function timeAgo(date?: string | null): string {
  if (!date) return '—'
  try {
    return formatDistanceToNow(parseISO(date), { addSuffix: true })
  } catch {
    return date
  }
}

export function formatCurrency(amount?: number | null): string {
  if (amount === null || amount === undefined) return '—'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export const STATUS_LABELS: Record<AssetStatus, string> = {
  available: 'Available',
  assigned: 'Assigned',
  under_maintenance: 'Under Maintenance',
  retired: 'Retired',
  disposed: 'Disposed',
}

export const STATUS_COLORS: Record<AssetStatus, string> = {
  available: 'badge-green',
  assigned: 'badge-blue',
  under_maintenance: 'badge-yellow',
  retired: 'badge-gray',
  disposed: 'badge-red',
}

export const ONBOARDING_STATUS_COLORS: Record<OnboardingStatus, string> = {
  draft: 'badge badge-gray',
  pending_hr_approval: 'badge badge-yellow',
  pending_coo_approval: 'badge badge-orange',
  pending_approval: 'badge badge-yellow',   // legacy
  approved: 'badge badge-blue',
  rejected: 'badge badge-red',
  in_progress: 'badge badge-purple',
  completed: 'badge badge-green',
}

export const ROLE_LABELS: Record<Role, string> = {
  coo: 'COO',
  hr: 'HR',
  it_head: 'IT Head',
  it_team: 'IT Team',
  management: 'Management',
  employee: 'Employee',
}

export const ROLE_COLORS: Record<Role, string> = {
  coo: 'badge-purple',
  hr: 'badge-blue',
  it_head: 'badge-blue',
  it_team: 'badge-blue',
  management: 'badge-yellow',
  employee: 'badge-gray',
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function warrantyDaysLeft(warrantyEnd?: string | null): number | null {
  if (!warrantyEnd) return null
  const diff = new Date(warrantyEnd).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function warrantyColor(days: number | null): string {
  if (days === null) return 'text-gray-400'
  if (days < 0) return 'text-red-600 font-semibold'
  if (days <= 30) return 'text-red-500 font-medium'
  if (days <= 90) return 'text-yellow-600 font-medium'
  return 'text-green-600'
}