import { Check } from 'lucide-react'
import { cn } from '../../lib/utils'

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-center">
      {steps.map((label, i) => {
        const done = i < current
        const active = i === current
        return (
          <div key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-2">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all duration-300',
                  done && 'bg-accent-600 text-white',
                  active && 'bg-accent-600 text-white ring-4 ring-accent-100 dark:ring-accent-900/40',
                  !done && !active && 'bg-ink-100 text-ink-400 dark:bg-ink-800',
                )}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  'hidden text-xs font-medium whitespace-nowrap sm:block',
                  active ? 'text-accent-700 dark:text-accent-400' : 'text-ink-400',
                )}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="mx-2 h-0.5 flex-1 rounded-full bg-ink-100 dark:bg-ink-800">
                <div
                  className="h-0.5 rounded-full bg-accent-600 transition-all duration-500 ease-out"
                  style={{ width: done ? '100%' : '0%' }}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
