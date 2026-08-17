import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'
import { Card } from './Card'

export function StatCard({
  label,
  value,
  icon,
  trend,
  tone = 'neutral',
}: {
  label: string
  value: string
  icon: ReactNode
  trend?: string
  tone?: 'neutral' | 'success' | 'warning' | 'danger'
}) {
  const toneClass = {
    neutral: 'bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-400',
    success: 'bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-500',
    warning: 'bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-500',
    danger: 'bg-danger-50 text-danger-700 dark:bg-danger-500/10 dark:text-danger-500',
  }[tone]

  return (
    <Card className="p-5 transition-shadow hover:shadow-[var(--shadow-card-hover)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-ink-500 dark:text-ink-400">{label}</p>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight text-ink-900 dark:text-ink-50">{value}</p>
          {trend && <p className="mt-1 text-xs text-ink-400">{trend}</p>}
        </div>
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', toneClass)}>{icon}</div>
      </div>
    </Card>
  )
}
