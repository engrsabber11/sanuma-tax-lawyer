import { useState } from 'react'
import { CalendarCheck2, ChevronDown } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { cn, formatDate, urgencyFromDate } from '../../lib/utils'
import type { FilingPeriod } from '../../data/types'

export interface ScheduleGroup {
  key: string
  obligationName: string
  /** Human cycle description, e.g. "Quarterly · Feb–Apr, May–Jul, Aug–Oct, Nov–Jan". */
  cycle: string
  periods: FilingPeriod[]
}

/** Periods shown per group before collapsing the rest. */
const VISIBLE_PER_GROUP = 5

/**
 * Read-only view of a generated filing schedule.
 *
 * This is the last step of onboarding and takes ZERO inputs — it exists so the
 * lawyer can check the generated dates against the certificate in their hand
 * before committing. Phase 5's Compliance tab reuses it, which is why it takes
 * already-generated periods rather than a draft.
 *
 * Periods are NOT filtered by the selected tax year. A backdated registration's
 * first period belongs to an earlier tax year — the sample Corporate Tax
 * certificate is effective Feb 2025 and its first return is due Sep 2026 — and
 * filtering it out hides the exact period the certificate is about.
 */
export function SchedulePreview({
  groups,
  taxYear,
  showState = false,
}: {
  groups: ScheduleGroup[]
  /** The client year being opened. Context for the headline, not a filter. */
  taxYear?: number
  /** Phase 5 renders live filing state; onboarding has nothing to show yet. */
  showState?: boolean
}) {
  const all = groups.flatMap((g) => g.periods)
  const outstanding = all.filter((p) => p.state === 'pending')
  const firstDue = outstanding.map((p) => p.dueDate).sort()[0]

  if (all.length === 0) {
    return (
      <div className="rounded-xl border border-ink-200 p-5 text-sm text-ink-500 dark:border-ink-700 dark:text-ink-400">
        No filings generated yet — check the effective dates in the previous step.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3 rounded-xl border border-success-200 bg-success-50 p-4 dark:border-success-800 dark:bg-success-500/10">
        <CalendarCheck2 className="mt-0.5 h-5 w-5 shrink-0 text-success-600" />
        <div>
          <p className="text-sm font-medium text-ink-800 dark:text-ink-100">
            {outstanding.length} filing{outstanding.length === 1 ? '' : 's'} scheduled
            {firstDue && <> — first due {formatDate(firstDue)}</>}.
          </p>
          <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">
            Worked out from the effective dates and cycles you entered — nothing here was typed by hand.
            {taxYear !== undefined && <> Tax year {taxYear} will be opened for this client.</>}
          </p>
        </div>
      </div>

      {groups.map((group) => (
        <ScheduleGroupCard key={group.key} group={group} showState={showState} />
      ))}
    </div>
  )
}

function ScheduleGroupCard({ group, showState }: { group: ScheduleGroup; showState: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const sorted = [...group.periods].sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const shown = expanded ? sorted : sorted.slice(0, VISIBLE_PER_GROUP)
  const hidden = sorted.length - shown.length

  return (
    <div className="overflow-hidden rounded-xl border border-ink-200 dark:border-ink-700">
      <div className="flex items-baseline justify-between gap-3 border-b border-ink-100 bg-ink-50 px-4 py-2.5 dark:border-ink-800 dark:bg-ink-800/50">
        <div>
          <p className="text-sm font-medium text-ink-800 dark:text-ink-100">{group.obligationName}</p>
          <p className="text-xs text-ink-500 dark:text-ink-400">{group.cycle}</p>
        </div>
        <span className="shrink-0 text-xs text-ink-400">{sorted.length} scheduled</span>
      </div>
      <div className="divide-y divide-ink-100 dark:divide-ink-800">
        {shown.map((p) => (
          <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
            <span className="w-36 shrink-0 font-medium text-ink-800 dark:text-ink-100">{p.label}</span>
            <span className="hidden flex-1 text-xs text-ink-400 sm:block">
              {formatDate(p.periodStart)} – {formatDate(p.periodEnd)}
            </span>
            <span className="ml-auto shrink-0 text-xs text-ink-500 dark:text-ink-400">Due {formatDate(p.dueDate)}</span>
            {showState && <FilingStateBadge period={p} />}
          </div>
        ))}
      </div>
      {hidden > 0 && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="flex w-full items-center justify-center gap-1.5 border-t border-ink-100 px-4 py-2 text-xs font-medium text-accent-600 hover:bg-ink-50 dark:border-ink-800 dark:hover:bg-ink-800"
        >
          <ChevronDown className="h-3.5 w-3.5" />
          Show {hidden} more
        </button>
      )}
      {expanded && (
        <button
          onClick={() => setExpanded(false)}
          className="flex w-full items-center justify-center gap-1.5 border-t border-ink-100 px-4 py-2 text-xs font-medium text-accent-600 hover:bg-ink-50 dark:border-ink-800 dark:hover:bg-ink-800"
        >
          <ChevronDown className={cn('h-3.5 w-3.5 rotate-180')} />
          Show less
        </button>
      )}
    </div>
  )
}

function FilingStateBadge({ period }: { period: FilingPeriod }) {
  if (period.state === 'filed') return <Badge tone="success">filed</Badge>
  if (period.state === 'not-required') return <Badge tone="neutral">n/a</Badge>
  const urgency = urgencyFromDate(period.dueDate)
  if (urgency === 'critical') return <Badge tone="critical">long overdue</Badge>
  if (urgency === 'danger') return <Badge tone="danger">overdue</Badge>
  if (urgency === 'warning') return <Badge tone="warning">due soon</Badge>
  return <Badge tone="neutral">upcoming</Badge>
}
