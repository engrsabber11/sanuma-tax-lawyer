import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  width?: string
}

export function Modal({ open, onClose, title, children, footer, width = 'max-w-lg' }: ModalProps) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-ink-950/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={`relative w-full ${width} max-h-[85vh] overflow-y-auto rounded-2xl border border-ink-200/70 bg-white shadow-[var(--shadow-popover)] dark:border-ink-800 dark:bg-ink-900`}
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 4 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4 dark:border-ink-800">
              <h2 className="text-base font-semibold text-ink-900 dark:text-ink-50">{title}</h2>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800 dark:hover:text-ink-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5">{children}</div>
            {footer && <div className="flex items-center justify-end gap-2 border-t border-ink-100 px-5 py-4 dark:border-ink-800">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
