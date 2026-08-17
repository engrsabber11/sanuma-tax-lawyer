import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../lib/utils'

const fieldClass =
  'w-full rounded-lg border border-ink-200 bg-white px-3.5 h-10 text-sm text-ink-900 placeholder:text-ink-400 outline-none transition-colors focus:border-accent-500 focus:ring-4 focus:ring-accent-500/10 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100'

export function Label({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between">
      <label className="text-sm font-medium text-ink-700 dark:text-ink-300">{children}</label>
      {hint && <span className="text-xs text-ink-400">{hint}</span>}
    </div>
  )
}

export function ErrorText({ children }: { children: ReactNode }) {
  return <p className="mt-1.5 text-xs text-danger-600 dark:text-danger-500">{children}</p>
}

export const invalidFieldClass = 'border-danger-500! focus:border-danger-500! focus:ring-danger-500/10!'

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldClass, className)} {...rest} />
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldClass, 'h-auto min-h-20 py-2.5 resize-none', className)} {...rest} />
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cn(fieldClass, 'appearance-none pr-9', className)} {...rest}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
    </div>
  )
}
