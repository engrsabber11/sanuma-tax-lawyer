import type {
  ClientDocument,
  DocumentTypeDef,
  FilingPeriod,
  ObligationType,
  ReminderAudience,
  ReminderLogEntry,
  ReminderRule,
} from './types'

/**
 * Reminder derivation.
 *
 * Reminders are DERIVED from dates, never stored. Same reasoning as
 * `FilingPeriod.state`: a stored "a reminder is due" flag goes stale the moment
 * the clock moves. What gets stored is what actually happened — the log.
 *
 * There is no scheduler in this prototype and nothing is actually sent. This
 * module answers "what would fire today", which is what the rules page shows and
 * what the dashboard's internal worklist reads.
 */

export interface DueReminder {
  key: string
  rule: ReminderRule
  clientId: string
  /** Human line, e.g. "VAT Return Aug–Oct 2026 is due in 7 days". */
  subject: string
  targetDate: string
  /** Which milestone in `rule.daysBefore` matched. 0 = D-Day. */
  milestone: number
  audience: ReminderAudience
  filingPeriodId?: string
  documentId?: string
  /** Set when this exact reminder has already been logged today. */
  alreadySentAt?: string
}

function daysBetween(fromIso: string, toIso: string): number {
  const [fy, fm, fd] = fromIso.split('-').map(Number)
  const [ty, tm, td] = toIso.split('-').map(Number)
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000)
}

function milestoneLabel(days: number): string {
  if (days === 0) return 'is due today'
  if (days === 1) return 'is due tomorrow'
  return `is due in ${days} days`
}

/**
 * Every reminder that a rule says should fire on `today`.
 *
 * A reminder fires when the days remaining exactly equals one of the rule's
 * milestones — not "within", or every milestone would fire every day once the
 * deadline is close.
 */
export function dueReminders(input: {
  rules: ReminderRule[]
  documents: ClientDocument[]
  documentTypes: DocumentTypeDef[]
  filingPeriods: FilingPeriod[]
  obligationTypes: ObligationType[]
  /** Closed years produce nothing — the work is done and signed off. */
  isYearClosed?: (clientId: string, taxYear: number) => boolean
  /** Used to mark reminders already sent today, so nothing gets double-sent. */
  log?: ReminderLogEntry[]
  today: string
}): DueReminder[] {
  const { rules, documents, documentTypes, filingPeriods, obligationTypes, isYearClosed, log, today } = input
  const out: DueReminder[] = []

  // Keyed on subject + target, because a reminder is "the same reminder" when it
  // is about the same thing on the same day, regardless of which rule produced it.
  const sentToday = new Map<string, string>()
  for (const entry of log ?? []) {
    if (!entry.sentAt.startsWith(today)) continue
    const target = entry.filingPeriodId ?? entry.documentId
    if (target) sentToday.set(target, entry.sentAt)
  }

  const enabled = rules.filter((r) => r.enabled)
  const obligationRules = new Map(enabled.filter((r) => r.subjectKind === 'obligation').map((r) => [r.subjectTypeId, r]))
  const documentRules = new Map(enabled.filter((r) => r.subjectKind === 'document').map((r) => [r.subjectTypeId, r]))
  const obligationById = new Map(obligationTypes.map((t) => [t.id, t]))
  const documentTypeById = new Map(documentTypes.map((t) => [t.id, t]))

  for (const period of filingPeriods) {
    // Filed, not-required and closed-year filings are settled work.
    if (period.state !== 'pending') continue
    if (isYearClosed?.(period.clientId, period.taxYear)) continue
    const rule = obligationRules.get(period.obligationTypeId)
    if (!rule) continue
    const days = daysBetween(today, period.dueDate)
    if (!rule.daysBefore.includes(days)) continue
    const name = obligationById.get(period.obligationTypeId)?.name ?? 'Filing'
    out.push({
      key: `${rule.id}:${period.id}:${days}`,
      rule,
      clientId: period.clientId,
      subject: `${name} ${period.label} ${milestoneLabel(days)}`,
      targetDate: period.dueDate,
      milestone: days,
      audience: rule.audience,
      filingPeriodId: period.id,
      alreadySentAt: sentToday.get(period.id),
    })
  }

  for (const doc of documents) {
    const type = documentTypeById.get(doc.typeId)
    if (!type?.hasExpiry) continue
    const rule = documentRules.get(doc.typeId)
    if (!rule) continue
    const days = daysBetween(today, doc.expiryDate)
    if (!rule.daysBefore.includes(days)) continue
    out.push({
      key: `${rule.id}:${doc.id}:${days}`,
      rule,
      clientId: doc.clientId,
      subject: `${type.name} ${days === 0 ? 'expires today' : `expires in ${days} days`}`,
      targetDate: doc.expiryDate,
      milestone: days,
      audience: rule.audience,
      documentId: doc.id,
      alreadySentAt: sentToday.get(doc.id),
    })
  }

  return out.sort((a, b) => a.targetDate.localeCompare(b.targetDate))
}

/**
 * Everything a rule would fire on within `horizonDays`, regardless of whether a
 * milestone lands exactly today. The rules page uses this to show what a rule
 * actually covers — with exact-match only, most rules look inert on any given
 * day, which reads as "this is broken" rather than "nothing is due".
 */
export function upcomingForRule(input: {
  rule: ReminderRule
  documents: ClientDocument[]
  documentTypes: DocumentTypeDef[]
  filingPeriods: FilingPeriod[]
  today: string
  horizonDays: number
}): { targetDate: string; clientId: string; days: number }[] {
  const { rule, documents, documentTypes, filingPeriods, today, horizonDays } = input
  if (!rule.enabled) return []

  if (rule.subjectKind === 'obligation') {
    return filingPeriods
      .filter((p) => p.obligationTypeId === rule.subjectTypeId && p.state === 'pending')
      .map((p) => ({ targetDate: p.dueDate, clientId: p.clientId, days: daysBetween(today, p.dueDate) }))
      .filter((x) => x.days >= 0 && x.days <= horizonDays)
      .sort((a, b) => a.days - b.days)
  }

  const type = documentTypes.find((t) => t.id === rule.subjectTypeId)
  if (!type?.hasExpiry) return []
  return documents
    .filter((d) => d.typeId === rule.subjectTypeId)
    .map((d) => ({ targetDate: d.expiryDate, clientId: d.clientId, days: daysBetween(today, d.expiryDate) }))
    .filter((x) => x.days >= 0 && x.days <= horizonDays)
    .sort((a, b) => a.days - b.days)
}

export const MILESTONE_LABEL = (days: number) => (days === 0 ? 'On the day' : `T-${days}`)
