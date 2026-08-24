import { Paperclip, Sparkles, X } from 'lucide-react'
import { Input, Label, Select } from '../ui/Field'
import { deriveFirstPeriod, dueDateFor, staggerLabel } from '../../data/filingPeriods'
import { formatDate } from '../../lib/utils'
import type { ObligationType, Periodicity, QuarterStagger } from '../../data/types'

export interface ObligationDraft {
  obligationTypeId: string
  registrationNumber: string
  effectiveDate: string
  /** Overrides the catalog default — only used when the cycle picker offers it. */
  periodicity?: Periodicity
  staggerGroup?: QuarterStagger
  fiscalYearEndMonth?: number
  certificateFileName?: string
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/**
 * One card per selected obligation, hard-capped at three inputs: TRN, effective
 * date, and a pre-picked cycle. Everything else about the schedule is derived.
 *
 * Adding a fourth field here is how this screen turns back into the form the
 * client asked us not to build.
 */
export function RegistrationFields({
  drafts,
  obligationTypes,
  onChange,
}: {
  drafts: ObligationDraft[]
  obligationTypes: ObligationType[]
  onChange: (obligationTypeId: string, patch: Partial<ObligationDraft>) => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-ink-500 dark:text-ink-400">
        Read these off the FTA certificate. Three fields each — the filing dates are worked out from them.
      </p>
      {drafts.map((draft) => {
        const type = obligationTypes.find((t) => t.id === draft.obligationTypeId)
        if (!type) return null
        return <RegistrationCard key={draft.obligationTypeId} draft={draft} type={type} onChange={onChange} />
      })}
    </div>
  )
}

function RegistrationCard({
  draft,
  type,
  onChange,
}: {
  draft: ObligationDraft
  type: ObligationType
  onChange: (obligationTypeId: string, patch: Partial<ObligationDraft>) => void
}) {
  const periodicity = draft.periodicity ?? type.periodicity
  const set = (patch: Partial<ObligationDraft>) => onChange(draft.obligationTypeId, patch)

  // Live derivation — immediate proof that three fields were enough.
  const derived = draft.effectiveDate
    ? deriveFirstPeriod(draft.effectiveDate, periodicity, {
        staggerGroup: draft.staggerGroup,
        fiscalYearEndMonth: draft.fiscalYearEndMonth ?? type.fiscalYearEndMonth,
      })
    : null
  const derivedDue = derived ? dueDateFor(derived.firstPeriodEnd, type.dueRule) : null

  return (
    <div className="rounded-xl border border-ink-200 p-4 dark:border-ink-700">
      <p className="text-sm font-semibold text-ink-800 dark:text-ink-100">{type.name}</p>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label hint="optional">Tax Registration Number</Label>
          <Input
            placeholder="e.g. 104877501700003"
            value={draft.registrationNumber}
            onChange={(e) => set({ registrationNumber: e.target.value })}
          />
        </div>
        <div>
          <Label>Effective Registration Date *</Label>
          <Input type="date" value={draft.effectiveDate} onChange={(e) => set({ effectiveDate: e.target.value })} />
        </div>
      </div>

      {type.periodicity === 'quarterly' && (
        <div className="mt-3">
          <Label>Tax periods</Label>
          <Select
            value={draft.periodicity === 'monthly' ? 'monthly' : (draft.staggerGroup ?? '')}
            onChange={(e) => {
              const v = e.target.value
              if (v === 'monthly') set({ periodicity: 'monthly', staggerGroup: undefined })
              else set({ periodicity: undefined, staggerGroup: v as QuarterStagger })
            }}
          >
            {(type.staggerOptions ?? []).map((g) => (
              <option key={g} value={g}>
                {staggerLabel(g)}
              </option>
            ))}
            <option value="monthly">Monthly filer (turnover over AED 150M)</option>
          </Select>
          <p className="mt-1.5 text-xs text-ink-400">
            The certificate lists these under &ldquo;Start and end dates of Tax periods&rdquo;.
          </p>
        </div>
      )}

      {type.periodicity === 'annual' && (
        <div className="mt-3">
          <Label>Financial year ends</Label>
          <Select
            value={String(draft.fiscalYearEndMonth ?? type.fiscalYearEndMonth ?? 12)}
            onChange={(e) => set({ fiscalYearEndMonth: Number(e.target.value) })}
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </Select>
        </div>
      )}

      {derived && derivedDue && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-accent-50 px-3 py-2.5 text-xs text-accent-800 dark:bg-accent-900/20 dark:text-accent-300">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            First period <strong>{formatDate(derived.firstPeriodStart)} – {formatDate(derived.firstPeriodEnd)}</strong>
            {' · '}first return due <strong>{formatDate(derivedDue)}</strong>
          </span>
        </div>
      )}

      <div className="mt-3 border-t border-ink-100 pt-3 dark:border-ink-800">
        {draft.certificateFileName ? (
          <div className="flex items-center gap-2 text-xs text-ink-600 dark:text-ink-300">
            <Paperclip className="h-3.5 w-3.5 shrink-0 text-success-600" />
            <span className="truncate">{draft.certificateFileName}</span>
            <button
              onClick={() => set({ certificateFileName: undefined })}
              className="ml-auto rounded p-1 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800"
              aria-label="Remove attached certificate"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <label className="flex w-fit cursor-pointer items-center gap-1.5 text-xs font-medium text-accent-600 hover:underline">
            <Paperclip className="h-3.5 w-3.5" />
            Attach certificate
            <input
              type="file"
              className="hidden"
              onChange={(e) => set({ certificateFileName: e.target.files?.[0]?.name })}
            />
          </label>
        )}
      </div>
    </div>
  )
}
