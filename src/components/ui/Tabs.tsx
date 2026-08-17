import { cn } from '../../lib/utils'

interface TabsProps {
  tabs: { id: string; label: string; count?: number }[]
  active: string
  onChange: (id: string) => void
}

export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div className="flex items-center gap-1 border-b border-ink-200 dark:border-ink-800">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'relative flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium transition-colors',
            active === tab.id ? 'text-accent-700 dark:text-accent-400' : 'text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-200',
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={cn('rounded-full px-1.5 text-xs', active === tab.id ? 'bg-accent-100 text-accent-700 dark:bg-accent-900/50 dark:text-accent-300' : 'bg-ink-100 text-ink-500 dark:bg-ink-800')}>
              {tab.count}
            </span>
          )}
          {active === tab.id && (
            <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-accent-600" />
          )}
        </button>
      ))}
    </div>
  )
}
