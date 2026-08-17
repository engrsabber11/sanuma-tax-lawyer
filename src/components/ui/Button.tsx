import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: ReactNode
  loading?: boolean
}

const variants: Record<Variant, string> = {
  primary: 'bg-accent-600 text-white hover:bg-accent-700 active:bg-accent-800 shadow-sm',
  secondary: 'bg-white text-ink-800 border border-ink-200 hover:bg-ink-50 dark:bg-ink-900 dark:text-ink-100 dark:border-ink-700 dark:hover:bg-ink-800',
  ghost: 'text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800',
  danger: 'bg-danger-600 text-white hover:bg-danger-700',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-9.5 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-[15px] gap-2',
}

export function Button({ variant = 'primary', size = 'md', icon, loading, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-150 ease-out disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-ink-900',
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  )
}
