import type { ReactNode } from 'react'

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-ink-200 py-14 text-center dark:border-ink-700">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-100 text-ink-400 dark:bg-ink-800">
        {icon}
      </div>
      <div>
        <p className="font-medium text-ink-800 dark:text-ink-100">{title}</p>
        <p className="mt-1 max-w-sm text-sm text-ink-500 dark:text-ink-400">{description}</p>
      </div>
      {action}
    </div>
  )
}
