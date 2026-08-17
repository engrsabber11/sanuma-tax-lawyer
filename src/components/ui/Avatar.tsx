import { cn } from '../../lib/utils'
import { initials } from '../../lib/utils'

export function Avatar({ name, color, size = 'md' }: { name: string; color?: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'h-7 w-7 text-xs', md: 'h-9 w-9 text-sm', lg: 'h-12 w-12 text-base' }
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-semibold text-white',
        color ?? 'bg-accent-500',
        sizes[size],
      )}
    >
      {initials(name)}
    </div>
  )
}
