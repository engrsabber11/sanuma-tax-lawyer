import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Scale } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { CommandPalette } from './CommandPalette'

export function AppShell() {
  const [search, setSearch] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearch(true)
      }
      if (e.key === 'Escape') setSearch(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-ink-50 dark:bg-ink-950">
      <Sidebar />

      <AnimatePresence>
        {mobileNav && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <motion.div
              className="absolute inset-0 bg-ink-950/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileNav(false)}
            />
            <motion.div
              className="absolute inset-y-0 left-0 w-72 bg-white dark:bg-ink-900"
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex h-16 items-center justify-between px-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-600 text-white">
                    <Scale className="h-4.5 w-4.5" />
                  </div>
                  <p className="text-sm font-semibold text-ink-900 dark:text-ink-50">Sanuma Practice OS</p>
                </div>
                <button onClick={() => setMobileNav(false)} className="rounded-lg p-1.5 text-ink-400">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="[&>aside]:!flex [&>aside]:!w-full [&>aside]:!border-0">
                <Sidebar />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onSearch={() => setSearch(true)} onMenu={() => setMobileNav(true)} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl animate-fade-in px-4 py-6 lg:px-8 lg:py-8">
            <Outlet />
          </div>
        </main>
      </div>

      <CommandPalette open={search} onClose={() => setSearch(false)} />
    </div>
  )
}
