import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Label, Select, ErrorText } from '../ui/Field'
import { useData } from '../../data/store'
import { useToast } from '../../lib/toast'
import { cn, formatAED, sleep } from '../../lib/utils'

export function NewQuoteModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { clients, services, addQuote } = useData()
  const { show } = useToast()
  const [clientId, setClientId] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [showErrors, setShowErrors] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setClientId(clients[0]?.id ?? '')
      setSelected([])
      setShowErrors(false)
    }
  }, [open])

  function toggle(id: string) {
    setSelected((sel) => (sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]))
  }

  const amount = selected.reduce((sum, id) => {
    const s = services.find((x) => x.id === id)
    return sum + (s ? s.price * 1.05 : 0)
  }, 0)

  async function submit() {
    if (!clientId || selected.length === 0) {
      setShowErrors(true)
      return
    }
    setSubmitting(true)
    await sleep(400 + Math.random() * 200)
    addQuote({ clientId, serviceIds: selected, amount })
    show('Quote created')
    setSubmitting(false)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New Quote"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} loading={submitting}>
            Create Quote
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
          <Label hint={`${selected.length} selected`}>Services</Label>
          <div className="flex flex-col gap-2">
            {services.map((s) => {
              const active = selected.includes(s.id)
              return (
                <button
                  key={s.id}
                  onClick={() => toggle(s.id)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border px-3.5 py-2.5 text-left text-sm transition-colors',
                    active ? 'border-accent-500 bg-accent-50 dark:bg-accent-900/20' : 'border-ink-200 hover:bg-ink-50 dark:border-ink-700 dark:hover:bg-ink-800',
                  )}
                >
                  <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-md border', active ? 'border-accent-600 bg-accent-600 text-white' : 'border-ink-300 dark:border-ink-600')}>
                    {active && <Check className="h-3.5 w-3.5" />}
                  </span>
                  <span className="flex-1 text-ink-700 dark:text-ink-200">{s.name}</span>
                  <span className="text-ink-500 dark:text-ink-400">{formatAED(s.price)}</span>
                </button>
              )
            })}
          </div>
          {showErrors && selected.length === 0 && <ErrorText>Select at least one service</ErrorText>}
        </div>
        {selected.length > 0 && (
          <div className="flex justify-between rounded-lg bg-ink-50 px-3.5 py-2.5 text-sm font-semibold text-ink-900 dark:bg-ink-800 dark:text-ink-50">
            <span>Total (incl. VAT)</span>
            <span>{formatAED(amount)}</span>
          </div>
        )}
      </div>
    </Modal>
  )
}
