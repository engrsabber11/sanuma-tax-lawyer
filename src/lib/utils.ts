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

/**
 * Today as an ISO date, from the real clock.
 *
 * `TODAY` in mockData is a frozen seed-authoring constant, not the current date.
 * Anything that asks "what is due now" must use this — mixing the two makes one
 * page call a filing overdue while another counts down to it.
 */
export function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function daysUntil(iso: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(iso)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

export type Urgency = 'ok' | 'warning' | 'danger' | 'critical'

/**
 * How late something is, on one scale shared by filing deadlines and document
 * expiries.
 *
 * `critical` exists because the overdue side used to be a single bucket with no
 * ceiling: a return 24 days late and one 85 days late rendered identically, and
 * they are not the same problem. UAE late-payment penalty is 2% immediately then
 * 4% per month, so by day 31 a second cycle has accrued — which is why the
 * boundary is 30 days and not a round number picked to suit the UI.
 *
 * The same logic holds for documents: a trade licence three months lapsed is
 * worse than one lapsed last week, because fines accrue there too. One scale, so
 * no screen has to ask which one it should be using.
 */
export const CRITICAL_AFTER_DAYS_OVERDUE = 30

export function urgencyFromDays(days: number): Urgency {
  if (days < -CRITICAL_AFTER_DAYS_OVERDUE) return 'critical'
  if (days < 0) return 'danger'
  if (days <= 30) return 'warning'
  return 'ok'
}

/** True for anything already past its date — `danger` or worse. */
export function isOverdue(urgency: Urgency): boolean {
  return urgency === 'danger' || urgency === 'critical'
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
