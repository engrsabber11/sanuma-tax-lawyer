import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Cookie,
  ShoppingBasket,
  Sparkles,
  Store,
  User,
  UtensilsCrossed,
  Search,
  X,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input, Label } from '../../components/ui/Field'
import { Stepper } from '../../components/ui/Stepper'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { useData } from '../../data/store'
import type { BusinessType } from '../../data/types'
import { cn } from '../../lib/utils'
import { useToast } from '../../lib/toast'

const STEPS = ['Basic Info', 'Referral', 'Business Type', 'Documents']

const businessTypes: { id: BusinessType; label: string; icon: typeof Store; checklist: string[] }[] = [
  {
    id: 'grocery',
    label: 'Grocery / Supermarket',
    icon: ShoppingBasket,
    checklist: ['dt-trade-license', 'dt-municipality-permit', 'dt-civil-defense', 'dt-ejari', 'dt-eid', 'dt-visa', 'dt-vat-cert'],
  },
  {
    id: 'trading',
    label: 'Trading Company',
    icon: Store,
    checklist: ['dt-trade-license', 'dt-chamber', 'dt-customs', 'dt-vat-cert', 'dt-eid'],
  },
  {
    id: 'f&b',
    label: 'Food & Beverage',
    icon: UtensilsCrossed,
    checklist: ['dt-trade-license', 'dt-municipality-permit', 'dt-civil-defense', 'dt-ejari', 'dt-eid', 'dt-visa'],
  },
  {
    id: 'services',
    label: 'Professional Services',
    icon: Sparkles,
    checklist: ['dt-trade-license', 'dt-eid', 'dt-visa', 'dt-vat-cert'],
  },
  {
    id: 'other',
    label: 'Individual / Other',
    icon: User,
    checklist: ['dt-eid', 'dt-passport', 'dt-visa'],
  },
]

const DRAFT_KEY = 'sanuma-onboarding-draft'

interface DraftState {
  step: number
  name: string
  businessName: string
  phone: string
  email: string
  referrerId: string | null
  businessType: BusinessType | null
  checkedDocs: string[]
}

const emptyDraft: DraftState = {
  step: 0,
  name: '',
  businessName: '',
  phone: '',
  email: '',
  referrerId: null,
  businessType: null,
  checkedDocs: [],
}

export function ClientOnboarding() {
  const navigate = useNavigate()
  const { clients, documentTypes, addClient } = useData()
  const { show } = useToast()
  const [draft, setDraft] = useState<DraftState>(() => {
    const saved = localStorage.getItem(DRAFT_KEY)
    return saved ? JSON.parse(saved) : emptyDraft
  })
  const [resumed] = useState(() => !!localStorage.getItem(DRAFT_KEY))
  const [referrerQuery, setReferrerQuery] = useState('')
  const [showReferrerSearch, setShowReferrerSearch] = useState(false)
  const [done, setDone] = useState(false)
  const [newClientId, setNewClientId] = useState<string | null>(null)
  const [dir, setDir] = useState(1)

  useEffect(() => {
    if (!done) localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  }, [draft, done])

  const referrer = clients.find((c) => c.id === draft.referrerId) ?? null
  const chain = useMemo(() => {
    const result: string[] = []
    let current = clients.find((c) => c.id === draft.referrerId)
    while (current) {
      result.unshift(current.name)
      current = clients.find((c) => c.id === current?.referredById)
    }
    return result
  }, [draft.referrerId, clients])

  const referrerResults = referrerQuery
    ? clients.filter((c) => (c.name + (c.businessName ?? '')).toLowerCase().includes(referrerQuery.toLowerCase())).slice(0, 5)
    : clients.slice(0, 5)

  const selectedType = businessTypes.find((t) => t.id === draft.businessType)

  function update(patch: Partial<DraftState>) {
    setDraft((d) => ({ ...d, ...patch }))
  }

  function goto(step: number) {
    setDir(step > draft.step ? 1 : -1)
    update({ step })
  }

  function finish() {
    const created = addClient({
      name: draft.name,
      businessName: draft.businessName || undefined,
      businessType: draft.businessType ?? 'other',
      phone: draft.phone,
      whatsapp: draft.phone || undefined,
      email: draft.email || `${draft.name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
      referredById: draft.referrerId ?? undefined,
      status: 'active',
    })
    setNewClientId(created.id)
    setDone(true)
    show(`${created.name} added as a client`)
    localStorage.removeItem(DRAFT_KEY)
  }

  function startOver() {
    localStorage.removeItem(DRAFT_KEY)
    setDraft(emptyDraft)
    setNewClientId(null)
    setDone(false)
  }

  const canProceed = [!!draft.name && !!draft.phone, true, !!draft.businessType, true][draft.step]

  if (done) {
    const suggested = selectedType?.checklist.filter((id) => !draft.checkedDocs.includes(id)) ?? []
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center py-16 text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-success-100 text-success-600 dark:bg-success-500/15"
        >
          <CheckCircle2 className="h-9 w-9" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <h1 className="mt-5 text-xl font-semibold text-ink-900 dark:text-ink-50">{draft.name} is onboarded 🎉</h1>
          <p className="mt-1.5 text-sm text-ink-500 dark:text-ink-400">
            {referrer ? `Linked under ${referrer.name}'s referral chain.` : 'Added as a direct client.'}
          </p>
        </motion.div>

        {suggested.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-6 w-full">
            <Card className="p-5 text-left">
              <p className="text-sm font-medium text-ink-800 dark:text-ink-100">
                {suggested.length} document{suggested.length > 1 ? 's' : ''} suggested — request these from {draft.name}
              </p>
              <div className="mt-3 flex flex-col gap-2">
                {suggested.map((id) => {
                  const t = documentTypes.find((dt) => dt.id === id)
                  return (
                    <div key={id} className="flex items-center gap-2.5 rounded-lg bg-ink-50 px-3 py-2 text-sm text-ink-700 dark:bg-ink-800 dark:text-ink-200">
                      <div className="h-1.5 w-1.5 rounded-full bg-warning-500" />
                      {t?.name}
                    </div>
                  )
                })}
              </div>
            </Card>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-6 flex gap-3">
          <Button variant="secondary" onClick={startOver}>
            Onboard Another Client
          </Button>
          <Button onClick={() => navigate(newClientId ? `/clients/${newClientId}` : '/clients')} icon={<ArrowRight className="h-4 w-4" />}>
            View Client Profile
          </Button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900 dark:text-ink-50">Add New Client</h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">A quick, guided flow — should take well under a minute.</p>
      </div>

      {resumed && draft.step > 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-accent-50 px-3.5 py-2.5 text-sm text-accent-700 dark:bg-accent-900/20 dark:text-accent-400">
          <Sparkles className="h-4 w-4" /> Resumed your in-progress draft — nothing was lost.
        </div>
      )}

      <Card className="p-6">
        <Stepper steps={STEPS} current={draft.step} />

        <div className="relative mt-8 min-h-72 overflow-hidden">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={draft.step}
              custom={dir}
              initial={{ opacity: 0, x: dir * 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -24 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              {draft.step === 0 && (
                <div className="flex flex-col gap-4">
                  <div>
                    <Label>Full name *</Label>
                    <Input placeholder="e.g. Ahmed Al Falasi" value={draft.name} onChange={(e) => update({ name: e.target.value })} autoFocus />
                  </div>
                  <div>
                    <Label hint="optional">Business name</Label>
                    <Input placeholder="e.g. Al Falasi Grocery LLC" value={draft.businessName} onChange={(e) => update({ businessName: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <Label>Phone / WhatsApp *</Label>
                      <Input placeholder="+971 50 000 0000" value={draft.phone} onChange={(e) => update({ phone: e.target.value })} />
                    </div>
                    <div>
                      <Label hint="optional">Email</Label>
                      <Input type="email" placeholder="name@example.com" value={draft.email} onChange={(e) => update({ email: e.target.value })} />
                    </div>
                  </div>
                </div>
              )}

              {draft.step === 1 && (
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-ink-500 dark:text-ink-400">Was this client referred by an existing client? Skip if not.</p>
                  {referrer ? (
                    <div className="flex items-center gap-3 rounded-xl border border-accent-200 bg-accent-50 p-4 dark:border-accent-800 dark:bg-accent-900/20">
                      <Avatar name={referrer.name} color={referrer.avatarColor} />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-ink-800 dark:text-ink-100">{referrer.name}</p>
                        <p className="text-xs text-ink-500 dark:text-ink-400">{referrer.businessName}</p>
                      </div>
                      <button
                        onClick={() => update({ referrerId: null })}
                        className="rounded-lg p-1.5 text-ink-400 hover:bg-white/60 dark:hover:bg-ink-800"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                      <Input
                        placeholder="Search existing clients by name…"
                        className="pl-9"
                        value={referrerQuery}
                        onFocus={() => setShowReferrerSearch(true)}
                        onChange={(e) => {
                          setReferrerQuery(e.target.value)
                          setShowReferrerSearch(true)
                        }}
                      />
                      {showReferrerSearch && (
                        <div className="absolute z-10 mt-1.5 w-full overflow-hidden rounded-xl border border-ink-200/70 bg-white shadow-[var(--shadow-popover)] dark:border-ink-800 dark:bg-ink-900">
                          {referrerResults.map((c) => (
                            <button
                              key={c.id}
                              onClick={() => {
                                update({ referrerId: c.id })
                                setShowReferrerSearch(false)
                                setReferrerQuery('')
                              }}
                              className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm hover:bg-ink-100 dark:hover:bg-ink-800"
                            >
                              <Avatar name={c.name} color={c.avatarColor} size="sm" />
                              <div className="min-w-0">
                                <p className="truncate font-medium text-ink-800 dark:text-ink-100">{c.name}</p>
                                <p className="truncate text-xs text-ink-400">{c.businessName}</p>
                              </div>
                            </button>
                          ))}
                          {referrerResults.length === 0 && <p className="px-3.5 py-3 text-sm text-ink-400">No matches</p>}
                        </div>
                      )}
                    </div>
                  )}

                  {referrer && chain.length > 0 && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="rounded-xl bg-ink-50 p-4 dark:bg-ink-800/60">
                      <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-ink-400">Where this client will sit</p>
                      <div className="flex flex-wrap items-center gap-1.5 text-sm">
                        {chain.map((name, i) => (
                          <span key={name} className="flex items-center gap-1.5">
                            <Badge tone={i === chain.length - 1 ? 'accent' : 'neutral'}>{name}</Badge>
                            <ChevronRight className="h-3.5 w-3.5 text-ink-300" />
                          </span>
                        ))}
                        <Badge tone="success">{draft.name || 'New Client'}</Badge>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              {draft.step === 2 && (
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-ink-500 dark:text-ink-400">Pick the closest business type — this auto-suggests which documents to request.</p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {businessTypes.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => update({ businessType: t.id, checkedDocs: [] })}
                        className={cn(
                          'flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all hover:-translate-y-0.5',
                          draft.businessType === t.id
                            ? 'border-accent-500 bg-accent-50 shadow-[var(--shadow-card-hover)] dark:bg-accent-900/20'
                            : 'border-ink-200 hover:border-accent-300 dark:border-ink-700',
                        )}
                      >
                        <t.icon className={cn('h-5 w-5', draft.businessType === t.id ? 'text-accent-600' : 'text-ink-400')} />
                        <span className="text-xs font-medium text-ink-700 dark:text-ink-200">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {draft.step === 3 && (
                <div className="flex flex-col gap-4">
                  {selectedType ? (
                    <>
                      <div className="flex items-center gap-2 text-sm text-ink-500 dark:text-ink-400">
                        <Cookie className="h-4 w-4 text-accent-500" />
                        Suggested checklist for {selectedType.label} — check off any documents already in hand, or skip and add later.
                      </div>
                      <div className="flex flex-col gap-2">
                        {selectedType.checklist.map((id) => {
                          const t = documentTypes.find((dt) => dt.id === id)
                          const checked = draft.checkedDocs.includes(id)
                          return (
                            <button
                              key={id}
                              onClick={() =>
                                update({
                                  checkedDocs: checked ? draft.checkedDocs.filter((x) => x !== id) : [...draft.checkedDocs, id],
                                })
                              }
                              className={cn(
                                'flex items-center gap-3 rounded-lg border px-3.5 py-2.5 text-left text-sm transition-colors',
                                checked ? 'border-success-300 bg-success-50 dark:bg-success-500/10' : 'border-ink-200 hover:bg-ink-50 dark:border-ink-700 dark:hover:bg-ink-800',
                              )}
                            >
                              <span
                                className={cn(
                                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors',
                                  checked ? 'border-success-500 bg-success-500 text-white' : 'border-ink-300 dark:border-ink-600',
                                )}
                              >
                                {checked && <Check className="h-3.5 w-3.5" />}
                              </span>
                              <span className="text-ink-700 dark:text-ink-200">{t?.name}</span>
                              <span className="ml-auto text-xs text-ink-400">{t?.category}</span>
                            </button>
                          )
                        })}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-ink-400">Pick a business type first to see suggested documents.</p>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-8 flex items-center justify-between border-t border-ink-100 pt-5 dark:border-ink-800">
          <Button variant="ghost" onClick={() => goto(Math.max(0, draft.step - 1))} disabled={draft.step === 0} icon={<ArrowLeft className="h-4 w-4" />}>
            Back
          </Button>
          <div className="flex gap-2">
            {draft.step < STEPS.length - 1 ? (
              <>
                {draft.step > 0 && (
                  <Button variant="ghost" onClick={() => goto(draft.step + 1)}>
                    Skip
                  </Button>
                )}
                <span title={!canProceed ? 'Enter a name and phone number to continue' : undefined}>
                  <Button onClick={() => goto(draft.step + 1)} disabled={!canProceed} icon={<ArrowRight className="h-4 w-4" />}>
                    Continue
                  </Button>
                </span>
              </>
            ) : (
              <span title={!draft.name ? 'Enter a name in step 1 to finish onboarding' : undefined}>
                <Button onClick={finish} disabled={!draft.name}>
                  Finish Onboarding
                </Button>
              </span>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
