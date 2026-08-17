import { useEffect, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input, Label, Select, ErrorText, invalidFieldClass } from '../ui/Field'
import { useData, TODAY } from '../../data/store'
import { useToast } from '../../lib/toast'
import { addDays, cn, sleep } from '../../lib/utils'

export function NewDocumentModal({
  open,
  onClose,
  defaultClientId,
  defaultMatterId,
}: {
  open: boolean
  onClose: () => void
  defaultClientId?: string
  defaultMatterId?: string
}) {
  const { clients, documentTypes, addDocument } = useData()
  const { show } = useToast()
  const [clientId, setClientId] = useState('')
  const [typeId, setTypeId] = useState('')
  const [number, setNumber] = useState('')
  const [issueDate, setIssueDate] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [showErrors, setShowErrors] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setClientId(defaultClientId ?? clients[0]?.id ?? '')
      setTypeId(documentTypes[0]?.id ?? '')
      setNumber('')
      setIssueDate(TODAY)
      setExpiryDate(addDays(TODAY, 365))
      setShowErrors(false)
    }
  }, [open, defaultClientId])

  const dateError = issueDate && expiryDate && expiryDate <= issueDate ? 'Expiry date must be after the issue date' : null
  const isValid = !!clientId && !!typeId && !!issueDate && !!expiryDate && !dateError

  async function submit() {
    if (!isValid) {
      setShowErrors(true)
      return
    }
    setSubmitting(true)
    await sleep(400 + Math.random() * 200)
    addDocument({ clientId, typeId, number: number || undefined, issueDate, expiryDate, matterId: defaultMatterId })
    const type = documentTypes.find((t) => t.id === typeId)
    show(`${type?.name ?? 'Document'} added`)
    setSubmitting(false)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Document"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} loading={submitting}>
            Add Document
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
          <Label>Document Type</Label>
          <Select value={typeId} onChange={(e) => setTypeId(e.target.value)}>
            {documentTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label hint="optional">Document Number</Label>
          <Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="e.g. DED-778213" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Issue Date</Label>
            <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className={cn(showErrors && dateError && invalidFieldClass)} />
          </div>
          <div>
            <Label>Expiry Date</Label>
            <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className={cn(showErrors && dateError && invalidFieldClass)} />
          </div>
        </div>
        {showErrors && dateError && <ErrorText>{dateError}</ErrorText>}
      </div>
    </Modal>
  )
}
