import { useEffect, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input, Label, Select, ErrorText, invalidFieldClass } from '../ui/Field'
import { PhoneInput } from '../ui/PhoneInput'
import { isUaeMobile, UAE_MOBILE_PLACEHOLDER } from '../../lib/phone'
import { useData } from '../../data/store'
import { useToast } from '../../lib/toast'
import { cn, sleep } from '../../lib/utils'
import type { Client } from '../../data/types'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function EditClientModal({ client, open, onClose }: { client: Client; open: boolean; onClose: () => void }) {
  const { clients, updateClient } = useData()
  const { show } = useToast()
  const [form, setForm] = useState(client)
  const [showErrors, setShowErrors] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(client)
      setShowErrors(false)
    }
  }, [open, client])

  const errors = {
    name: !form.name.trim() ? 'Name is required' : null,
    phone: !form.phone.trim() ? 'Phone is required' : !isUaeMobile(form.phone) ? `Use a UAE mobile number, e.g. ${UAE_MOBILE_PLACEHOLDER}` : null,
    whatsapp: form.whatsapp?.trim() && !isUaeMobile(form.whatsapp) ? `Use a UAE mobile number, e.g. ${UAE_MOBILE_PLACEHOLDER}` : null,
    email: form.email.trim() && !EMAIL_RE.test(form.email) ? 'Enter a valid email address' : null,
  }
  const isValid = !errors.name && !errors.phone && !errors.whatsapp && !errors.email
  const sameAsPhone = !!form.whatsapp && form.whatsapp === form.phone

  async function save() {
    if (!isValid) {
      setShowErrors(true)
      return
    }
    setSubmitting(true)
    await sleep(400 + Math.random() * 200)
    updateClient(client.id, form)
    show('Client updated')
    setSubmitting(false)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Edit ${client.name}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={save} loading={submitting}>
            Save Changes
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <Label>Full Name</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={cn(showErrors && errors.name && invalidFieldClass)} />
          {showErrors && errors.name && <ErrorText>{errors.name}</ErrorText>}
        </div>
        <div>
          <Label hint="optional">Business Name</Label>
          <Input value={form.businessName ?? ''} onChange={(e) => setForm({ ...form, businessName: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Phone</Label>
            <PhoneInput
              value={form.phone}
              onChange={(phone) => setForm({ ...form, phone })}
              className={cn(showErrors && errors.phone && invalidFieldClass)}
            />
            {showErrors && errors.phone && <ErrorText>{errors.phone}</ErrorText>}
          </div>
          <div>
            <Label
              hint={
                sameAsPhone ? (
                  'same as phone'
                ) : isUaeMobile(form.phone) ? (
                  <button type="button" onClick={() => setForm({ ...form, whatsapp: form.phone })} className="text-accent-600 hover:underline">
                    Use phone
                  </button>
                ) : (
                  'optional'
                )
              }
            >
              WhatsApp
            </Label>
            <PhoneInput
              value={form.whatsapp ?? ''}
              onChange={(whatsapp) => setForm({ ...form, whatsapp })}
              className={cn(showErrors && errors.whatsapp && invalidFieldClass)}
            />
            {showErrors && errors.whatsapp && <ErrorText>{errors.whatsapp}</ErrorText>}
          </div>
        </div>
        <div>
          <Label>Email</Label>
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={cn(showErrors && errors.email && invalidFieldClass)} />
          {showErrors && errors.email && <ErrorText>{errors.email}</ErrorText>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label hint="optional">TRN</Label>
            <Input value={form.trn ?? ''} onChange={(e) => setForm({ ...form, trn: e.target.value })} />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Client['status'] })}>
              <option value="active">Active</option>
              <option value="onboarding">Onboarding</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label hint="optional">Primary Referrer (Level 1)</Label>
            <Select
              value={form.referredById ?? ''}
              onChange={(e) => setForm({ ...form, referredById: e.target.value || undefined })}
            >
              <option value="">None (Direct)</option>
              {clients
                .filter((c) => c.id !== client.id && c.id !== form.subReferredById)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.businessName ? `(${c.businessName})` : ''}
                  </option>
                ))}
            </Select>
          </div>
          <div>
            <Label hint="optional">Sub-Referrer (Level 2)</Label>
            <Select
              value={form.subReferredById ?? ''}
              onChange={(e) => setForm({ ...form, subReferredById: e.target.value || undefined })}
            >
              <option value="">None</option>
              {clients
                .filter((c) => c.id !== client.id && c.id !== form.referredById)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.businessName ? `(${c.businessName})` : ''}
                  </option>
                ))}
            </Select>
          </div>
        </div>
      </div>
    </Modal>
  )
}
