import { cn } from '../../lib/utils'

export function Switch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      role="switch"
      aria-checked={checked}
      className={cn(
        'relative h-5 w-9 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-ink-900',
        checked ? 'bg-accent-600' : 'bg-ink-200 dark:bg-ink-700',
      )}
    >
      <span
        className={cn(
          'absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0',
        )}
      />
    </button>
  )
}
