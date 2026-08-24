import { Check, Info } from 'lucide-react'
import { cn } from '../../lib/utils'
import type { ObligationType, Periodicity } from '../../data/types'

/** What each cycle actually costs the client per year — the point of the whole system. */
function cadenceHint(periodicity: Periodicity): string {
  if (periodicity === 'monthly') return '12 returns per year'
  if (periodicity === 'quarterly') return '4 returns per year'
  if (periodicity === 'annual') return '1 return per year'
  return 'expiry-based'
}

export function ObligationPicker({
  obligationTypes,
  selectedIds,
  onToggle,
  taxYear,
  onTaxYearChange,
  yearOptions,
  noneSelected,
  onSelectNone,
}: {
  obligationTypes: ObligationType[]
  selectedIds: string[]
  onToggle: (id: string) => void
  taxYear: number
  onTaxYearChange: (year: number) => void
  yearOptions: number[]
  noneSelected: boolean
  onSelectNone: () => void
}) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="mb-2 text-sm font-medium text-ink-700 dark:text-ink-300">Which tax year are you setting up?</p>
        <div className="flex gap-2">
          {yearOptions.map((y) => (
            <button
              key={y}
              onClick={() => onTaxYearChange(y)}
              className={cn(
                'rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                taxYear === y
                  ? 'border-accent-500 bg-accent-50 text-accent-700 dark:bg-accent-900/20 dark:text-accent-400'
                  : 'border-ink-200 text-ink-600 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800',
              )}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-ink-700 dark:text-ink-300">What are you handling for this client?</p>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {obligationTypes.map((t) => {
            const selected = selectedIds.includes(t.id)
            return (
              <button
                key={t.id}
                onClick={() => onToggle(t.id)}
                className={cn(
                  'flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all',
                  selected
                    ? 'border-accent-500 bg-accent-50 dark:bg-accent-900/20'
                    : 'border-ink-200 hover:border-accent-300 hover:bg-ink-50 dark:border-ink-700 dark:hover:bg-ink-800',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors',
                    selected ? 'border-accent-500 bg-accent-500 text-white' : 'border-ink-300 dark:border-ink-600',
                  )}
                >
                  {selected && <Check className="h-3.5 w-3.5" />}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-ink-800 dark:text-ink-100">{t.name}</span>
                  <span className="block text-xs text-ink-500 dark:text-ink-400">{cadenceHint(t.periodicity)}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <button
        onClick={onSelectNone}
        className={cn(
          'flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-left text-sm transition-colors',
          noneSelected
            ? 'border-accent-500 bg-accent-50 dark:bg-accent-900/20'
            : 'border-dashed border-ink-300 text-ink-500 hover:bg-ink-50 dark:border-ink-600 dark:text-ink-400 dark:hover:bg-ink-800',
        )}
      >
        <Info className="h-4 w-4 shrink-0" />
        <span>
          <span className="font-medium text-ink-700 dark:text-ink-200">No tax registrations yet</span>
          <span className="block text-xs">
            Licence or document work only — skip the registration steps and add them later.
          </span>
        </span>
      </button>
    </div>
  )
}
