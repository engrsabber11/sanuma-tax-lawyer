import { useEffect, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input, Label, Select, ErrorText, invalidFieldClass } from '../ui/Field'
import { useData } from '../../data/store'
import { useToast } from '../../lib/toast'
import { cn, sleep } from '../../lib/utils'
import type { Matter } from '../../data/types'

export function NewMatterModal({
  open,
  onClose,
  defaultClientId,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  defaultClientId?: string
  onCreated?: (matter: Matter) => void
}) {
  const { clients, services, addMatter } = useData()
  const { show } = useToast()
  const [clientId, setClientId] = useState('')
  const [title, setTitle] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [showErrors, setShowErrors] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setClientId(defaultClientId ?? clients[0]?.id ?? '')
      setTitle('')
      setServiceId(services[0]?.id ?? '')
      setDueDate('')
      setShowErrors(false)
    }
  }, [open, defaultClientId])

  const titleError = !title.trim() ? 'Matter title is required' : null

  async function submit() {
    if (!clientId || !title.trim() || !serviceId) {
      setShowErrors(true)
      return
    }
    setSubmitting(true)
    await sleep(400 + Math.random() * 200)
    const created = addMatter({ clientId, title, serviceId, dueDate: dueDate || undefined })
    show(`Matter "${created.title}" created`)
    onCreated?.(created)
    setSubmitting(false)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New Matter"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} loading={submitting}>
            Create Matter
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <Label>Client</Label>
          <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.businessName ? ` — ${c.businessName}` : ''}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Matter Title</Label>
          <Input
            placeholder="e.g. Trade License Renewal 2026"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={cn(showErrors && titleError && invalidFieldClass)}
            autoFocus
          />
          {showErrors && titleError && <ErrorText>{titleError}</ErrorText>}
        </div>
        <div>
          <Label>Service</Label>
          <Select value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label hint="optional">Due Date</Label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
      </div>
    </Modal>
  )
}
