import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-ink-200/70 bg-white shadow-[var(--shadow-card)] dark:border-ink-800 dark:bg-ink-900',
        className,
      )}
      {...rest}
    />
  )
}

export function CardHeader({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center justify-between px-5 pt-5', className)} {...rest} />
}

export function CardTitle({ className, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-[15px] font-semibold text-ink-900 dark:text-ink-50', className)} {...rest} />
}

export function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5', className)} {...rest} />
}
