import { useEffect, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input, Label, Textarea, ErrorText, invalidFieldClass } from '../ui/Field'
import { Switch } from '../ui/Switch'
import { useData } from '../../data/store'
import { useToast } from '../../lib/toast'
import { cn, sleep } from '../../lib/utils'
import type { Service } from '../../data/types'

const empty = { name: '', description: '', price: 0, vatApplicable: true }

export function ServiceFormModal({ open, onClose, initial }: { open: boolean; onClose: () => void; initial?: Service }) {
  const { addService, updateService } = useData()
  const { show } = useToast()
  const [form, setForm] = useState(empty)
  const [showErrors, setShowErrors] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(initial ? { name: initial.name, description: initial.description, price: initial.price, vatApplicable: initial.vatApplicable } : empty)
      setShowErrors(false)
    }
  }, [open, initial])

  const nameError = !form.name.trim() ? 'Service name is required' : null
  const priceError = form.price < 0 ? 'Price cannot be negative' : null

  async function submit() {
    if (nameError || priceError) {
      setShowErrors(true)
      return
    }
    setSubmitting(true)
    await sleep(400 + Math.random() * 200)
    if (initial) {
      updateService(initial.id, form)
      show('Service updated')
    } else {
      addService(form)
      show('Service added')
    }
    setSubmitting(false)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? `Edit ${initial.name}` : 'Add Service'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} loading={submitting}>
            {initial ? 'Save Changes' : 'Add Service'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <Label>Service Name</Label>
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
