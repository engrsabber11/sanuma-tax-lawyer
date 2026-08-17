import { useEffect, useState } from 'react'
import { Plus, Lock, Globe2, Building } from 'lucide-react'
import { Card, CardBody, CardHeader, CardTitle } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input, Label, Textarea } from '../../components/ui/Field'
import { Tabs } from '../../components/ui/Tabs'
import { NewDocumentTypeModal } from '../../components/modals/NewDocumentTypeModal'
import { useData } from '../../data/store'
import { useToast } from '../../lib/toast'
import { Avatar } from '../../components/ui/Avatar'

const categoryLabel: Record<string, string> = { personal: 'Personal', business: 'Business', tax: 'Tax & Regulatory', financial: 'Financial' }

export function SettingsPage() {
  const { documentTypes, firmProfile, updateFirmProfile } = useData()
  const { show } = useToast()
  const [tab, setTab] = useState('profile')
  const [addTypeOpen, setAddTypeOpen] = useState(false)
  const [draft, setDraft] = useState(firmProfile)

  useEffect(() => {
    setDraft(firmProfile)
  }, [firmProfile])

  function saveProfile() {
    updateFirmProfile(draft)
    show('Business profile updated')
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
              <Label>Support Phone</Label>
              <Input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
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
