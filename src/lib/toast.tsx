import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'

interface ToastItem {
  id: number
  message: string
}

const ToastContext = createContext<{ show: (message: string) => void } | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const show = useCallback((message: string) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, message }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200)
  }, [])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-60 flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto flex items-center gap-2.5 rounded-xl border border-ink-200/70 bg-white px-4 py-3 text-sm shadow-[var(--shadow-popover)] dark:border-ink-800 dark:bg-ink-900"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-success-600" />
              <span className="font-medium text-ink-800 dark:text-ink-100">{t.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
