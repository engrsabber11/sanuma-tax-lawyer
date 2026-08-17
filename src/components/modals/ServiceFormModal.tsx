import { useEffect, useRef, useState } from 'react'
import { Plus, Trash2, CornerDownRight } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input, Label, Textarea, ErrorText, invalidFieldClass } from '../ui/Field'
import { Switch } from '../ui/Switch'
import { useData } from '../../data/store'
import { useToast } from '../../lib/toast'
import { cn, sleep } from '../../lib/utils'
import type { Service } from '../../data/types'

const empty = { name: '', description: '', price: 0, vatApplicable: true }

/** A sub-service row in the form. `id` is present only for rows already saved in the catalog. */
interface SubRow {
  key: string
  id?: string
  name: string
  price: number | string
}

let rowSeq = 0
const newRow = (): SubRow => ({ key: `sub-${Date.now()}-${rowSeq++}`, name: '', price: '' })

export function ServiceFormModal({
  open,
  onClose,
  initial,
  parentId,
}: {
  open: boolean
  onClose: () => void
  initial?: Service
  /** Pre-selects the parent when adding a sub-service directly from a parent card. */
  parentId?: string
}) {
  const { services, addService, updateService, deleteService } = useData()
  const { show } = useToast()
  const [form, setForm] = useState(empty)
  const [subs, setSubs] = useState<SubRow[]>([])
  const [removedIds, setRemovedIds] = useState<string[]>([])
  const [showErrors, setShowErrors] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const effectiveParentId = initial ? initial.parentId : parentId
  const parent = services.find((s) => s.id === effectiveParentId)
  // Only one level deep: a sub-service cannot have its own children.
  const isSubService = !!effectiveParentId

  // `services` is deliberately read but not depended on: the rows are seeded when the modal opens,
  // and re-seeding on every store change would discard in-progress edits.
  const servicesRef = useRef(services)
  servicesRef.current = services

  useEffect(() => {
    if (!open) return
    setForm(
      initial
        ? { name: initial.name, description: initial.description, price: initial.price, vatApplicable: initial.vatApplicable }
        : empty,
    )
    if (initial) {
      const existingSubs = servicesRef.current
        .filter((s) => s.parentId === initial.id)
        .map((c) => ({ key: c.id, id: c.id, name: c.name, price: c.price }))
      setSubs(existingSubs.length > 0 ? existingSubs : [newRow()])
    } else {
      setSubs([newRow()])
    }
    setRemovedIds([])
    setShowErrors(false)
  }, [open, initial])

  const nameError = !form.name.trim() ? 'Service name is required' : null
  const priceError = form.price < 0 ? 'Price cannot be negative' : null
  const namedSubs = subs.filter((s) => s.name.trim().length > 0)
  const subsError = namedSubs.some((s) => s.price !== '' && Number(s.price) < 0)
    ? 'Sub-service price cannot be negative'
    : null

  function updateSub(key: string, patch: Partial<SubRow>) {
    setSubs((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)))
  }

  function removeSub(row: SubRow) {
    setSubs((prev) => {
      const next = prev.filter((s) => s.key !== row.key)
      return next.length === 0 ? [newRow()] : next
    })
    if (row.id) setRemovedIds((prev) => [...prev, row.id!])
  }

  async function submit() {
    if (nameError || priceError || subsError) {
      setShowErrors(true)
      return
    }
    setSubmitting(true)
    await sleep(400 + Math.random() * 200)

    const parentRecordId = initial ? initial.id : addService({ ...form, parentId: effectiveParentId }).id
    if (initial) updateService(initial.id, form)

    if (!isSubService) {
      removedIds.forEach((id) => deleteService(id))
      subs
        .filter((s) => s.name.trim().length > 0)
        .forEach((s) => {
          const numPrice = typeof s.price === 'number' ? s.price : (parseFloat(String(s.price)) || 0)
          const payload = { name: s.name.trim(), price: numPrice }
          if (s.id) updateService(s.id, payload)
          else addService({ ...payload, description: '', vatApplicable: form.vatApplicable, parentId: parentRecordId })
        })
    }

    const label = isSubService ? 'Sub-service' : 'Service'
    show(initial ? `${label} updated` : `${label} added`)
    setSubmitting(false)
    onClose()
  }

  const title = initial ? `Edit ${initial.name}` : isSubService ? `Add Sub-service` : 'Add Service'
  const cta = initial ? 'Save Changes' : isSubService ? 'Add Sub-service' : 'Add Service'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} loading={submitting}>
            {cta}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {parent && (
          <p className="flex items-center gap-2 rounded-lg bg-ink-50 px-3.5 py-2.5 text-sm text-ink-600 dark:bg-ink-800/60 dark:text-ink-300">
            <CornerDownRight className="h-4 w-4 shrink-0 text-ink-400" />
            Sub-service of <span className="font-medium text-ink-800 dark:text-ink-100">{parent.name}</span>
          </p>
        )}
        <div>
          <Label>{isSubService ? 'Sub-service Name' : 'Service Name'}</Label>
          <Input
            placeholder="e.g. VAT Registration"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={cn(showErrors && nameError && invalidFieldClass)}
            autoFocus
          />
          {showErrors && nameError && <ErrorText>{nameError}</ErrorText>}
        </div>

        {!isSubService && (
          <div className="rounded-xl border border-ink-200/70 bg-ink-50/50 p-4 dark:border-ink-800 dark:bg-ink-900/40">
            <div className="flex items-center justify-between mb-1">
              <Label className="mb-0">Sub-services</Label>
              <span className="text-xs text-ink-400">
                {subs.length ? `${subs.length} sub-service${subs.length > 1 ? 's' : ''}` : 'Optional'}
              </span>
            </div>
            <p className="mb-3 text-xs text-ink-500 dark:text-ink-400">
              Break this service into billable sub-services that can be quoted and invoiced individually.
            </p>
            <div className="flex flex-col gap-2">
              {subs.map((row) => (
                <div key={row.key} className="flex items-center gap-2">
                  <CornerDownRight className="h-4 w-4 shrink-0 text-ink-300 dark:text-ink-600" />
                  <Input
                    placeholder="Sub-service name (e.g. Return Filing)"
                    value={row.name}
                    onChange={(e) => updateSub(row.key, { name: e.target.value })}
                    className={cn('flex-1 bg-white dark:bg-ink-900', showErrors && !row.name.trim() && invalidFieldClass)}
                  />
                  <Input
                    type="number"
                    aria-label="Sub-service price"
                    placeholder="AED Price"
                    value={row.price}
                    onChange={(e) => updateSub(row.key, { price: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 })}
                    className={cn('w-28 shrink-0 bg-white dark:bg-ink-900', showErrors && row.price !== '' && Number(row.price) < 0 && invalidFieldClass)}
                  />
                  <button
                    type="button"
                    aria-label={`Remove ${row.name || 'sub-service'}`}
                    onClick={() => removeSub(row)}
                    className="shrink-0 rounded-lg p-2 text-ink-400 transition-colors hover:bg-danger-50 hover:text-danger-600 dark:hover:bg-danger-900/30"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <Button
              size="sm"
              variant="secondary"
              icon={<Plus className="h-3.5 w-3.5" />}
              className={cn(subs.length ? 'mt-2.5' : 'mt-1')}
              onClick={() => setSubs((prev) => [...prev, newRow()])}
            >
              Add sub-service
            </Button>
            {showErrors && subsError && <ErrorText>{subsError}</ErrorText>}
          </div>
        )}

        <div>
          <Label hint="optional">Description</Label>
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div>
          <Label>Price (AED)</Label>
          <Input
            type="number"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
            className={cn(showErrors && priceError && invalidFieldClass)}
          />
          {showErrors && priceError && <ErrorText>{priceError}</ErrorText>}
        </div>
        <div className="flex items-center justify-between rounded-lg border border-ink-200/70 px-3.5 py-2.5 dark:border-ink-800">
          <span className="text-sm font-medium text-ink-700 dark:text-ink-200">VAT Applicable (5%)</span>
          <Switch checked={form.vatApplicable} onChange={() => setForm({ ...form, vatApplicable: !form.vatApplicable })} />
        </div>
      </div>
    </Modal>
  )
}
