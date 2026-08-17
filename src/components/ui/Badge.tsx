import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'
import type { Urgency } from '../../lib/utils'

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger'

const tones: Record<Tone, string> = {
  neutral: 'bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-300',
  accent: 'bg-accent-100 text-accent-800 dark:bg-accent-900/40 dark:text-accent-300',
  success: 'bg-success-100 text-success-700 dark:bg-success-500/15 dark:text-success-500',
  warning: 'bg-warning-100 text-warning-700 dark:bg-warning-500/15 dark:text-warning-500',
  danger: 'bg-danger-100 text-danger-700 dark:bg-danger-500/15 dark:text-danger-500',
}

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone
  dot?: boolean
}

export function Badge({ tone = 'neutral', dot, className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap',
        tones[tone],
        className,
      )}
      {...rest}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', {
        'bg-ink-500': tone === 'neutral',
        'bg-accent-500': tone === 'accent',
        'bg-success-500': tone === 'success',
        'bg-warning-500': tone === 'warning',
        'bg-danger-500': tone === 'danger',
      })} />}
      {children}
    </span>
  )
}

const urgencyTone: Record<Urgency, Tone> = { ok: 'success', warning: 'warning', danger: 'danger' }
const urgencyLabel: Record<Urgency, string> = { ok: 'Valid', warning: 'Expiring soon', danger: 'Expired' }

export function UrgencyBadge({ urgency, label }: { urgency: Urgency; label?: string }) {
  return (
    <Badge tone={urgencyTone[urgency]} dot>
      {label ?? urgencyLabel[urgency]}
    </Badge>
  )
}
