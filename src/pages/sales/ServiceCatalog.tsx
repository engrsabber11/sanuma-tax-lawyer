import { useState } from 'react'
import { Plus, ShoppingBag, FileCheck2 } from 'lucide-react'
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
  const [editing, setEditing] = useState<Service | null>(null)

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
        {services.map((s) => (
          <Card key={s.id} className="p-5 transition-shadow hover:shadow-[var(--shadow-card-hover)]">
            <div className="flex items-start justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-50 text-accent-600 dark:bg-accent-900/30">
                <ShoppingBag className="h-4.5 w-4.5" />
              </span>
              {s.vatApplicable && (
                <Badge tone="neutral">
                  <FileCheck2 className="h-3 w-3" /> VAT 5%
                </Badge>
              )}
            </div>
            <p className="mt-3.5 font-semibold text-ink-900 dark:text-ink-50">{s.name}</p>
            <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{s.description}</p>
            <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3.5 dark:border-ink-800">
              <p className="text-lg font-semibold text-ink-900 dark:text-ink-50">{formatAED(s.price)}</p>
              <Button size="sm" variant="secondary" onClick={() => setEditing(s)}>
                Edit
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <ServiceFormModal open={addOpen} onClose={() => setAddOpen(false)} />
      <ServiceFormModal open={!!editing} onClose={() => setEditing(null)} initial={editing ?? undefined} />
    </div>
  )
}
