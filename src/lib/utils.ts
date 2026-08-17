import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatAED(amount: number) {
  return new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency: 'AED',
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function daysUntil(iso: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(iso)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

export type Urgency = 'ok' | 'warning' | 'danger'

/** Shared thresholds: >30 days = ok, 0-30 days = warning, <0 = danger (expired/overdue). */
export function urgencyFromDays(days: number): Urgency {
  if (days < 0) return 'danger'
  if (days <= 30) return 'warning'
  return 'ok'
}

export function urgencyFromDate(iso: string): Urgency {
  return urgencyFromDays(daysUntil(iso))
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function addDays(iso: string, days: number) {
  const d = new Date(iso)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

let idCounter = 0
export function genId(prefix: string) {
  idCounter += 1
  return `${prefix}-${Date.now().toString(36)}${idCounter}`
}

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}
