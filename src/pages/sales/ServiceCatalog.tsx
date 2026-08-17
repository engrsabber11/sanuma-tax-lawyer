import { useMemo, useState } from 'react'
import { Plus, ShoppingBag, FileCheck2, CornerDownRight } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { ServiceFormModal } from '../../components/modals/ServiceFormModal'
import { useData } from '../../data/store'
import { formatAED } from '../../lib/utils'
import type { Service } from '../../data/types'

export function ServiceCatalog() {
  const { services } = useData()
  const [addOpen, setAddOpen] = useState(false)
  const [addingSubTo, setAddingSubTo] = useState<Service | null>(null)
  const [editing, setEditing] = useState<Service | null>(null)

  const grouped = useMemo(
    () =>
      services
        .filter((s) => !s.parentId)
        .map((parent) => ({ parent, children: services.filter((s) => s.parentId === parent.id) })),
    [services],
  )

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900 dark:text-ink-50">Service Catalog</h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">The price list clients are quoted and invoiced from.</p>
        </div>
        <Button icon={<Plus className="h-4 w-4" />} onClick={() => setAddOpen(true)}>
          Add Service
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {grouped.map(({ parent: s, children }) => (
          <Card key={s.id} className="flex flex-col p-5 transition-shadow hover:shadow-[var(--shadow-card-hover)]">
            <div className="flex items-start justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-50 text-accent-600 dark:bg-accent-900/30">
                <ShoppingBag className="h-4.5 w-4.5" />
              </span>
              <div className="flex items-center gap-1.5">
                {children.length > 0 && <Badge tone="neutral">{children.length} sub</Badge>}
                {s.vatApplicable && (
                  <Badge tone="neutral">
                    <FileCheck2 className="h-3 w-3" /> VAT 5%
                  </Badge>
                )}
              </div>
            </div>
            <p className="mt-3.5 font-semibold text-ink-900 dark:text-ink-50">{s.name}</p>
            {s.description && <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{s.description}</p>}

            {/* Sub-services right under Service Name */}
            <div className="mt-3 flex-1 flex flex-col gap-1.5">
              {children.length > 0 ? (
                <div className="rounded-lg bg-ink-50/70 p-2.5 dark:bg-ink-800/50 flex flex-col gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-400 mb-0.5">
                    Sub-services ({children.length})
                  </span>
                  {children.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setEditing(c)}
                      className="group flex items-center gap-2 rounded-md bg-white px-2.5 py-1.5 text-left text-xs font-medium shadow-xs transition-colors hover:bg-ink-100 dark:bg-ink-900 dark:hover:bg-ink-800"
                    >
                      <CornerDownRight className="h-3 w-3 shrink-0 text-ink-400" />
                      <span className="flex-1 truncate text-ink-800 dark:text-ink-200">{c.name}</span>
                      <span className="font-semibold text-ink-600 dark:text-ink-300">{formatAED(c.price)}</span>
                    </button>
                  ))}
                </div>
              ) : null}
              <button
                onClick={() => setAddingSubTo(s)}
                className="flex items-center gap-1.5 self-start rounded-lg px-2 py-1 text-xs font-medium text-accent-600 transition-colors hover:bg-accent-50 dark:hover:bg-accent-900/20"
              >
                <Plus className="h-3 w-3" /> Add sub-service
              </button>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3.5 dark:border-ink-800">
              <div>
                <span className="text-xs text-ink-400 block">Base Price</span>
                <p className="text-lg font-semibold text-ink-900 dark:text-ink-50">{formatAED(s.price)}</p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => setEditing(s)}>
                Edit
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <ServiceFormModal open={addOpen} onClose={() => setAddOpen(false)} />
      <ServiceFormModal open={!!addingSubTo} onClose={() => setAddingSubTo(null)} parentId={addingSubTo?.id} />
      <ServiceFormModal open={!!editing} onClose={() => setEditing(null)} initial={editing ?? undefined} />
    </div>
  )
}
