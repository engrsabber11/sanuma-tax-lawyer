import { useEffect, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input, Label, Select, Textarea, ErrorText, invalidFieldClass } from '../ui/Field'
import { Switch } from '../ui/Switch'
import { useData } from '../../data/store'
import { flattenServices } from '../../data/serviceTree'
import { useToast } from '../../lib/toast'
import { cn, sleep } from '../../lib/utils'
import type { Service } from '../../data/types'

const empty = { name: '', description: '', price: 0, vatApplicable: true }

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
  const { services, addService, updateService } = useData()
  const { show } = useToast()
  const [form, setForm] = useState(empty)
  const [parentSelect, setParentSelect] = useState('')
  const [showErrors, setShowErrors] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const parent = services.find((s) => s.id === parentSelect)
  // Only one level deep: a sub-service cannot have children of its own.
  const isSubService = !!parentSelect
  const hasChildren = !!initial && services.some((s) => s.parentId === initial.id)
  // The whole tree is listed so the existing structure is visible, but only main services are
  // selectable — a sub-service under a sub-service would be a second level.
  // The `initial &&` guard matters: without it, `s.parentId !== undefined` drops every main service.
  const categoryOptions = flattenServices(services).filter(
    ({ service: s }) => s.id !== initial?.id && !(initial && s.parentId === initial.id),
  )

  useEffect(() => {
    if (!open) return
    setForm(
      initial
        ? { name: initial.name, description: initial.description, price: initial.price, vatApplicable: initial.vatApplicable }
        : empty,
    )
    setParentSelect((initial ? initial.parentId : parentId) ?? '')
    setShowErrors(false)
  }, [open, initial, parentId])

  const nameError = !form.name.trim() ? 'Service name is required' : null
  const priceError = form.price < 0 ? 'Price cannot be negative' : null

  async function submit() {
    if (nameError || priceError) {
      setShowErrors(true)
      return
    }
    setSubmitting(true)
    await sleep(400 + Math.random() * 200)

    // A sub-service has no price of its own — it bills at its parent's.
    const record = { ...form, price: parent ? parent.price : form.price, parentId: parentSelect || undefined }
    if (initial) updateService(initial.id, record)
    else addService(record)

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
        <div>
          <Label hint={hasChildren ? 'has sub-services' : 'optional'}>Parent Service</Label>
          <Select value={parentSelect} onChange={(e) => setParentSelect(e.target.value)} disabled={hasChildren}>
            <option value="">None — this is a main service</option>
            {categoryOptions.map(({ service: s, depth }) => (
              <option key={s.id} value={s.id} disabled={depth > 0}>
                {depth > 0 ? `   ↳ ${s.name}` : s.name}
              </option>
            ))}
          </Select>
          <p className="mt-1.5 text-xs text-ink-500 dark:text-ink-400">
            {hasChildren
              ? 'A service with sub-services under it cannot itself become a sub-service.'
              : parent
                ? `Saved as a sub-service under ${parent.name}.`
                : 'Pick a service to save this one as a sub-service under it.'}
          </p>
        </div>
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

        <div>
          <Label hint="optional">Description</Label>
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div>
          <Label hint={isSubService ? 'inherited' : undefined}>Price (AED)</Label>
          <Input
            type="number"
            value={isSubService ? (parent?.price ?? 0) : form.price}
            disabled={isSubService}
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
