import type {
  DueRule,
  FilingPeriod,
  ObligationType,
  Periodicity,
  QuarterStagger,
  Registration,
} from './types'

/**
 * Pure filing-period generator.
 *
 * Given a registration entered once (TRN, effective date, cycle), this produces
 * the complete schedule of filing periods and due dates that follow from it.
 *
 * Everything here is pure and calendar-arithmetic only — no `new Date()` reads
 * of the current time, no locale dependence — so the golden cases in
 * `plans/tax-year-engine/phases/PHASE-01-domain-model.md` are reproducible.
 *
 * Dates are ISO `YYYY-MM-DD` strings throughout and are parsed by hand rather
 * than through `new Date(iso)`, which resolves to UTC midnight and then shifts
 * under local-timezone accessors.
 */

// --- calendar helpers ------------------------------------------------------

interface DateParts {
  y: number
  m: number // 1-12
  d: number
}

function parseISO(iso: string): DateParts {
  const [y, m, d] = iso.split('-').map(Number)
  return { y, m, d }
}

function fmt(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** Days in month `m` (1-12) of year `y`, leap years included. */
function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

/** Last calendar day of the month containing `iso`. */
export function endOfMonth(iso: string): string {
  const { y, m } = parseISO(iso)
  return fmt(y, m, daysInMonth(y, m))
}

/**
 * Adds months, clamping to the target month's last day.
 * `(2027-01-31, +1)` → `2027-02-28`, and `(2025-12-31, +9)` → `2026-09-30`
 * rather than rolling into October.
 */
export function addMonthsClamped(iso: string, months: number): string {
  const { y, m, d } = parseISO(iso)
  const total = y * 12 + (m - 1) + months
  const ny = Math.floor(total / 12)
  const nm = (total % 12) + 1
  return fmt(ny, nm, Math.min(d, daysInMonth(ny, nm)))
}

function nextDay(iso: string): string {
  const { y, m, d } = parseISO(iso)
  if (d < daysInMonth(y, m)) return fmt(y, m, d + 1)
  if (m < 12) return fmt(y, m + 1, 1)
  return fmt(y + 1, 1, 1)
}

function nextMonthOf(y: number, m: number): { y: number; m: number } {
  return m === 12 ? { y: y + 1, m: 1 } : { y, m: m + 1 }
}

// --- stagger groups -------------------------------------------------------

/** Period START months for each FTA quarterly stagger group. */
export const STAGGER_START_MONTHS: Record<QuarterStagger, number[]> = {
  'jan-apr-jul-oct': [1, 4, 7, 10],
  'feb-may-aug-nov': [2, 5, 8, 11],
  'mar-jun-sep-dec': [3, 6, 9, 12],
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Human label for a stagger group, e.g. "Feb–Apr, May–Jul, Aug–Oct, Nov–Jan". */
export function staggerLabel(group: QuarterStagger): string {
  return STAGGER_START_MONTHS[group]
    .map((start) => {
      const endMonth = ((start + 1) % 12) + 1
      return `${MONTH_NAMES[start - 1]}–${MONTH_NAMES[endMonth - 1]}`
    })
    .join(', ')
}

const MONTH_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** Cycle in words, for cards and previews. Shared by onboarding and Phase 5. */
export function cycleDescription(
  periodicity: Periodicity,
  opts: { staggerGroup?: QuarterStagger; fiscalYearEndMonth?: number } = {},
): string {
  if (periodicity === 'monthly') return 'Monthly · calendar month'
  if (periodicity === 'quarterly') {
    return opts.staggerGroup ? `Quarterly · ${staggerLabel(opts.staggerGroup)}` : 'Quarterly'
  }
  if (periodicity === 'annual') {
    const m = MONTH_FULL[(opts.fiscalYearEndMonth ?? 12) - 1]
    return `Annual · financial year ends ${m}`
  }
  return 'Expiry-based'
}

// --- due dates ------------------------------------------------------------

export function dueDateFor(periodEnd: string, rule: DueRule): string {
  if (rule.kind === 'last-day-next-month') {
    const { y, m } = parseISO(periodEnd)
    const next = nextMonthOf(y, m)
    return fmt(next.y, next.m, daysInMonth(next.y, next.m))
  }
  if (rule.kind === 'day-of-next-month') {
    const { y, m } = parseISO(periodEnd)
    const next = nextMonthOf(y, m)
    return fmt(next.y, next.m, Math.min(rule.day, daysInMonth(next.y, next.m)))
  }
  if (rule.kind === 'months-after-period-end') {
    return addMonthsClamped(periodEnd, rule.months)
  }
  // 'on-expiry' — the period end *is* the deadline.
  return periodEnd
}

// --- period boundaries ----------------------------------------------------

/**
 * Derives the first period from just the effective date + cycle — this is what
 * keeps onboarding to three fields.
 *
 * The start is the effective date itself, NOT the period's natural start: a
 * business is not liable before it was registered, which is why the sample CT
 * certificate's first period is 11 months and not 12.
 */
export function deriveFirstPeriod(
  effectiveDate: string,
  periodicity: Periodicity,
  opts: { staggerGroup?: QuarterStagger; fiscalYearEndMonth?: number } = {},
): { firstPeriodStart: string; firstPeriodEnd: string } {
  const { y, m } = parseISO(effectiveDate)

  if (periodicity === 'monthly') {
    return { firstPeriodStart: effectiveDate, firstPeriodEnd: endOfMonth(effectiveDate) }
  }

  if (periodicity === 'quarterly') {
    const starts = STAGGER_START_MONTHS[opts.staggerGroup ?? 'jan-apr-jul-oct']
    // The containing period begins at the latest stagger start month <= the
    // effective month; if none, it began in the previous calendar year.
    const candidates = starts.filter((s) => s <= m)
    const startMonth = candidates.length ? Math.max(...candidates) : Math.max(...starts)
    const startYear = candidates.length ? y : y - 1
    const firstPeriodEnd = endOfMonth(addMonthsClamped(fmt(startYear, startMonth, 1), 2))
    return { firstPeriodStart: effectiveDate, firstPeriodEnd }
  }

  if (periodicity === 'annual') {
    const fyEnd = opts.fiscalYearEndMonth ?? 12
    const endYear = m <= fyEnd ? y : y + 1
    return {
      firstPeriodStart: effectiveDate,
      firstPeriodEnd: fmt(endYear, fyEnd, daysInMonth(endYear, fyEnd)),
    }
  }

  // 'expiry' obligations are document-driven and generate no periods.
  return { firstPeriodStart: effectiveDate, firstPeriodEnd: effectiveDate }
}

/**
 * The next period always begins the day after the previous one ended, so the
 * stagger group and fiscal year end are already encoded in where the last
 * period finished — they never need re-deriving.
 */
export function nextPeriodAfter(
  periodEnd: string,
  periodicity: Periodicity,
): { periodStart: string; periodEnd: string } {
  const periodStart = nextDay(periodEnd)
  const span = periodicity === 'monthly' ? 0 : periodicity === 'quarterly' ? 2 : 11
  return { periodStart, periodEnd: endOfMonth(addMonthsClamped(periodStart, span)) }
}

// --- labels ---------------------------------------------------------------

/**
 * Quarterly periods are never labelled Q1-Q4: for a staggered filer "Q1" is
 * ambiguous and wrong — Aug–Oct is nobody's Q1. Month names are unambiguous.
 */
export function labelForPeriod(periodEnd: string, periodicity: Periodicity): string {
  const end = parseISO(periodEnd)

  if (periodicity === 'annual') return `FY ${end.y}`
  if (periodicity === 'monthly') return `${MONTH_NAMES[end.m - 1]} ${end.y}`
  if (periodicity === 'expiry') return `Expires ${MONTH_NAMES[end.m - 1]} ${end.y}`

  // Quarterly: label by the natural period months, not by the (possibly
  // mid-month) effective start date of a stub period.
  const naturalStartMonth = ((end.m - 3 + 12) % 12) + 1
  const naturalStartYear = end.m - 2 <= 0 ? end.y - 1 : end.y
  const from = MONTH_NAMES[naturalStartMonth - 1]
  const to = MONTH_NAMES[end.m - 1]
  return naturalStartYear === end.y
    ? `${from}–${to} ${end.y}`
    : `${from} ${naturalStartYear}–${to} ${end.y}`
}

/**
 * What a matter opened against a filing period starts life as.
 *
 * Pure and exported so the store and the New Matter modal derive the same
 * values: the modal shows them before the click, the store writes them on it,
 * and a second source of truth would let the two disagree.
 *
 * `dueDate` is the filing due date, not the period end — the deadline is what
 * the kanban and the matters list sort on.
 */
export function matterDefaultsForFiling(
  period: FilingPeriod,
  obligationType: ObligationType | undefined,
): { title: string; serviceId?: string; dueDate: string } {
  return {
    title: `${obligationType?.name ?? 'Filing'} — ${period.label}`,
    serviceId: obligationType?.serviceId,
    dueDate: period.dueDate,
  }
}

// --- the generator --------------------------------------------------------

/** Runaway guard — a monthly filer over the widest sane horizon stays far under. */
const MAX_PERIODS = 240

export function generateFilingPeriods(
  registration: Registration,
  obligationType: ObligationType,
  throughTaxYear: number,
): FilingPeriod[] {
  const periodicity = registration.periodicity
  if (periodicity === 'expiry') return []

  const rule = registration.dueRule ?? obligationType.dueRule
  const out: FilingPeriod[] = []

  let periodStart = registration.firstPeriodStart
  let periodEnd = registration.firstPeriodEnd

  for (let i = 0; i < MAX_PERIODS; i++) {
    const taxYear = parseISO(periodEnd).y
    if (taxYear > throughTaxYear) break
    if (registration.status === 'deregistered' && registration.deregisteredAt && periodStart > registration.deregisteredAt) {
      break
    }

    out.push({
      // Deterministic, so regeneration is idempotent and back-links survive.
      id: `fp-${registration.id}-${periodStart}`,
      registrationId: registration.id,
      clientId: registration.clientId,
      obligationTypeId: registration.obligationTypeId,
      label: labelForPeriod(periodEnd, periodicity),
      periodStart,
      periodEnd,
      dueDate: dueDateFor(periodEnd, rule),
      taxYear,
      state: 'pending',
    })

    const next = nextPeriodAfter(periodEnd, periodicity)
    periodStart = next.periodStart
    periodEnd = next.periodEnd
  }

  return out
}
