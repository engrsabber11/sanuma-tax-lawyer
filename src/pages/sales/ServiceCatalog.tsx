import { Fragment, useMemo, useState } from 'react'
import { Plus, ShoppingBag, FileCheck2, CornerDownRight } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { ServiceFormModal } from '../../components/modals/ServiceFormModal'
import { useData } from '../../data/store'
import { effectivePrice, serviceLabel } from '../../data/serviceTree'
import { formatAED } from '../../lib/utils'
import type { Service } from '../../data/types'

export function ServiceCatalog() {
  const { services } = useData()
  const [addOpen, setAddOpen] = useState(false)
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
          <Fragment key={s.id}>
            <Card className="flex flex-col p-5 transition-shadow hover:shadow-[var(--shadow-card-hover)]">
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

              <div className="mt-4 flex flex-1 items-end justify-between border-t border-ink-100 pt-3.5 dark:border-ink-800">
                <p className="text-lg font-semibold text-ink-900 dark:text-ink-50">{formatAED(s.price)}</p>
                <Button size="sm" variant="secondary" onClick={() => setEditing(s)}>
                  Edit
                </Button>
              </div>
            </Card>

            {children.map((c) => (
              <Card
                key={c.id}
                className="flex flex-col border-l-[3px] border-l-accent-500 p-5 transition-shadow hover:shadow-[var(--shadow-card-hover)]"
              >
                <div className="flex items-start justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-50 text-accent-600 dark:bg-accent-900/30">
                    <CornerDownRight className="h-4.5 w-4.5" />
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Badge tone="neutral">Sub-service</Badge>
                    {c.vatApplicable && (
                      <Badge tone="neutral">
                        <FileCheck2 className="h-3 w-3" /> VAT 5%
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="mt-3.5 font-semibold text-ink-900 dark:text-ink-50">{serviceLabel(c, services)}</p>
                {c.description && <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{c.description}</p>}

                <div className="mt-4 flex flex-1 items-end justify-between border-t border-ink-100 pt-3.5 dark:border-ink-800">
                  <p className="text-lg font-semibold text-ink-900 dark:text-ink-50">
                    {formatAED(effectivePrice(c, services))}
                  </p>
                  <Button size="sm" variant="secondary" onClick={() => setEditing(c)}>
                    Edit
                  </Button>
                </div>
              </Card>
            ))}
          </Fragment>
        ))}
      </div>

      <ServiceFormModal open={addOpen} onClose={() => setAddOpen(false)} />
      <ServiceFormModal open={!!editing} onClose={() => setEditing(null)} initial={editing ?? undefined} />
    </div>
  )
}