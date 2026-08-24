import { useEffect, useState } from 'react'
import { Plus, Lock, Globe2, Building } from 'lucide-react'
import { Card, CardBody, CardHeader, CardTitle } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { ErrorText, Input, Label, Textarea, invalidFieldClass } from '../../components/ui/Field'
import { PhoneInput } from '../../components/ui/PhoneInput'
import { Switch } from '../../components/ui/Switch'
import { isUaePhone, UAE_MOBILE_PLACEHOLDER } from '../../lib/phone'
import { cn } from '../../lib/utils'
import { Tabs } from '../../components/ui/Tabs'
import { NewDocumentTypeModal } from '../../components/modals/NewDocumentTypeModal'
import { useData } from '../../data/store'
import { useToast } from '../../lib/toast'
import { Avatar } from '../../components/ui/Avatar'

const categoryLabel: Record<string, string> = { personal: 'Personal', business: 'Business', tax: 'Tax & Regulatory', financial: 'Financial' }

export function SettingsPage() {
  const { documentTypes, firmProfile, updateFirmProfile, penaltyFeeRule, updatePenaltyFeeRule } = useData()
  const { show } = useToast()
  const [tab, setTab] = useState('profile')
  const [addTypeOpen, setAddTypeOpen] = useState(false)
  const [draft, setDraft] = useState(firmProfile)
  const [penaltyDraft, setPenaltyDraft] = useState(penaltyFeeRule)

  useEffect(() => {
    setDraft(firmProfile)
  }, [firmProfile])

  useEffect(() => {
    setPenaltyDraft(penaltyFeeRule)
  }, [penaltyFeeRule])

  function saveProfile() {
    updateFirmProfile(draft)
    show('Business profile updated')
  }

  function savePenaltyRule() {
    updatePenaltyFeeRule({ ...penaltyDraft, amount: Math.max(0, penaltyDraft.amount), label: penaltyDraft.label.trim() || penaltyFeeRule.label })
    show('Billing rules updated')
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900 dark:text-ink-50">Settings</h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Firm profile, document types, and preferences.</p>
      </div>

      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'profile', label: 'Business Profile' },
          { id: 'doctypes', label: 'Document Types', count: documentTypes.length },
          { id: 'billing', label: 'Billing Rules' },
          { id: 'team', label: 'Team & Access' },
          { id: 'preferences', label: 'Preferences' },
        ]}
      />

      {tab === 'profile' && (
        <Card>
          <CardHeader>
            <CardTitle>Firm Details</CardTitle>
          </CardHeader>
          <CardBody className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
            <div className="flex items-center gap-4 sm:col-span-2">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-600 text-white">
                <Building className="h-7 w-7" />
              </div>
              <Button variant="secondary" size="sm">
                Upload Logo
              </Button>
            </div>
            <div>
              <Label>Firm Name</Label>
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </div>
            <div>
              <Label>TRN</Label>
              <Input value={draft.trn} onChange={(e) => setDraft({ ...draft, trn: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label>Address</Label>
              <Textarea value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} />
            </div>
            <div>
              <Label hint="mobile or landline">Support Phone</Label>
              <PhoneInput
                value={draft.phone}
                onChange={(phone) => setDraft({ ...draft, phone })}
                placeholder="+971 4 123 4567"
                className={cn(draft.phone && !isUaePhone(draft.phone) && invalidFieldClass)}
              />
              {draft.phone && !isUaePhone(draft.phone) && <ErrorText>Enter a UAE number, e.g. +971 4 123 4567 or {UAE_MOBILE_PLACEHOLDER}</ErrorText>}
            </div>
            <div>
              <Label>Support Email</Label>
              <Input value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Button className="w-fit" onClick={saveProfile}>
                Save Changes
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {tab === 'doctypes' && (
        <Card>
          <CardHeader>
            <CardTitle>Document Type Library</CardTitle>
            <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setAddTypeOpen(true)}>
              Add Document Type
            </Button>
          </CardHeader>
          <CardBody className="pt-2">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-400 dark:border-ink-800">
                    <th className="py-3 font-medium">Document Type</th>
                    <th className="py-3 font-medium">Category</th>
                    <th className="py-3 font-medium">Has Expiry</th>
                    <th className="py-3 font-medium">Default Reminders</th>
                  </tr>
                </thead>
                <tbody>
                  {documentTypes.map((t) => (
                    <tr key={t.id} className="border-b border-ink-50 last:border-0 dark:border-ink-800/60">
                      <td className="py-3 font-medium text-ink-800 dark:text-ink-100">{t.name}</td>
                      <td className="py-3 text-ink-500 dark:text-ink-400">{categoryLabel[t.category]}</td>
                      <td className="py-3">
                        <Badge tone={t.hasExpiry ? 'success' : 'neutral'}>{t.hasExpiry ? 'Yes' : 'No expiry'}</Badge>
                      </td>
                      <td className="py-3 text-ink-500 dark:text-ink-400">
                        {t.defaultReminderDays.length ? t.defaultReminderDays.join('d, ') + 'd' : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {tab === 'billing' && (
        <Card>
          <CardHeader>
            <CardTitle>Firm-Initiated Matter Penalty</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col gap-4 pt-2">
            <p className="text-sm text-ink-500 dark:text-ink-400">
              When a matter is opened without client involvement, this minimum fee is queued against the client and added automatically to their next
              invoice. Changing it here only affects matters opened from now on.
            </p>
            <div className="flex items-center justify-between rounded-xl border border-ink-200/70 p-4 dark:border-ink-800">
              <div>
                <p className="text-sm font-medium text-ink-800 dark:text-ink-100">Apply penalty fee</p>
                <p className="text-xs text-ink-400">Turn off to stop charging for firm-initiated matters</p>
              </div>
              <Switch checked={penaltyDraft.enabled} onChange={() => setPenaltyDraft({ ...penaltyDraft, enabled: !penaltyDraft.enabled })} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Minimum Fee (AED)</Label>
                <Input
                  type="number"
                  value={penaltyDraft.amount}
                  onChange={(e) => setPenaltyDraft({ ...penaltyDraft, amount: parseFloat(e.target.value) || 0 })}
                  disabled={!penaltyDraft.enabled}
                />
              </div>
              <div className="flex items-end">
                <div className="flex h-10 w-full items-center justify-between rounded-lg border border-ink-200/70 px-3.5 dark:border-ink-800">
                  <span className="text-sm font-medium text-ink-700 dark:text-ink-200">VAT Applicable (5%)</span>
                  <Switch
                    checked={penaltyDraft.vatApplicable}
                    onChange={() => setPenaltyDraft({ ...penaltyDraft, vatApplicable: !penaltyDraft.vatApplicable })}
                  />
                </div>
              </div>
            </div>
            <div>
              <Label>Invoice Line Label</Label>
              <Input
                value={penaltyDraft.label}
                onChange={(e) => setPenaltyDraft({ ...penaltyDraft, label: e.target.value })}
                disabled={!penaltyDraft.enabled}
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={savePenaltyRule}>Save Billing Rules</Button>
            </div>
          </CardBody>
        </Card>
      )}

      {tab === 'team' && (
        <Card>
          <CardHeader>
            <CardTitle>Team &amp; Access</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col gap-4 pt-2">
            <div className="flex items-center gap-3 rounded-xl border border-ink-200/70 p-4 dark:border-ink-800">
              <Avatar name="Sanuma Lawyer" />
              <div className="flex-1">
                <p className="font-medium text-ink-800 dark:text-ink-100">You (Owner)</p>
                <p className="text-xs text-ink-400">Full access</p>
              </div>
              <Badge tone="success">Active</Badge>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-dashed border-ink-200 p-4 text-ink-400 dark:border-ink-700">
              <Lock className="h-4 w-4" />
              <p className="flex-1 text-sm">Multi-staff logins and role-based permissions — coming in a future phase.</p>
            </div>
          </CardBody>
        </Card>
      )}

      {tab === 'preferences' && (
        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col gap-4 pt-2">
            <div className="flex items-center justify-between rounded-xl border border-ink-200/70 p-4 dark:border-ink-800">
              <div className="flex items-center gap-3">
                <Globe2 className="h-4 w-4 text-ink-400" />
                <div>
                  <p className="text-sm font-medium text-ink-800 dark:text-ink-100">Interface Language</p>
                  <p className="text-xs text-ink-400">English (Arabic toggle planned for a future phase)</p>
                </div>
              </div>
              <Badge tone="neutral">English</Badge>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-ink-200/70 p-4 dark:border-ink-800">
              <div>
                <p className="text-sm font-medium text-ink-800 dark:text-ink-100">Default Currency</p>
                <p className="text-xs text-ink-400">Used across invoices, expenses and reports</p>
              </div>
              <Badge tone="neutral">AED</Badge>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-ink-200/70 p-4 dark:border-ink-800">
              <div>
                <p className="text-sm font-medium text-ink-800 dark:text-ink-100">Sensitive Document Masking</p>
                <p className="text-xs text-ink-400">Blur EID/Passport/Visa numbers by default in list views</p>
              </div>
              <Badge tone="success">Enabled</Badge>
            </div>
          </CardBody>
        </Card>
      )}

      <NewDocumentTypeModal open={addTypeOpen} onClose={() => setAddTypeOpen(false)} />
    </div>
  )
}
