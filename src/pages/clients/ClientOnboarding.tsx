import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, CalendarCheck2, Sparkles } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ErrorText, Input, Label, Select, invalidFieldClass } from '../../components/ui/Field'
import { PhoneInput } from '../../components/ui/PhoneInput'
import { isUaeMobile, UAE_MOBILE_PLACEHOLDER } from '../../lib/phone'
import { Stepper } from '../../components/ui/Stepper'
import { ObligationPicker } from '../../components/onboarding/ObligationPicker'
import { RegistrationFields, type ObligationDraft } from '../../components/onboarding/RegistrationFields'
import { ReferralPicker } from '../../components/onboarding/ReferralPicker'
import { SchedulePreview, type ScheduleGroup } from '../../components/onboarding/SchedulePreview'
import { useData, PERIOD_HORIZON_YEARS, TODAY } from '../../data/store'
import { cycleDescription, deriveFirstPeriod, generateFilingPeriods } from '../../data/filingPeriods'
import { BUSINESS_TYPE_LABEL, SUGGESTED_DOCUMENTS } from '../../data/suggestedDocuments'
import type { BusinessType, Registration } from '../../data/types'
import { cn } from '../../lib/utils'
import { useToast } from '../../lib/toast'

const STEPS = ['Client', 'What We Handle', 'Registrations', 'Confirm Schedule']
const DRAFT_KEY = 'sanuma-onboarding-draft-v2'

interface DraftState {
  step: number
  name: string
  businessName: string
  phone: string
  whatsapp: string
  email: string
  personType: 'legal' | 'natural'
  businessType: BusinessType | ''
  referrerId: string | null
  subReferrerId: string | null
  taxYear: number
  /** Explicit "licence work only" path — skips steps 3 and 4. */
  noRegistrations: boolean
  obligations: ObligationDraft[]
}

const CURRENT_TAX_YEAR = Number(TODAY.slice(0, 4))

const emptyDraft: DraftState = {
  step: 0,
  name: '',
  businessName: '',
  phone: '',
  whatsapp: '',
  email: '',
  personType: 'legal',
  businessType: '',
  referrerId: null,
  subReferrerId: null,
  taxYear: CURRENT_TAX_YEAR,
  noRegistrations: false,
  obligations: [],
}

export function ClientOnboarding() {
  const navigate = useNavigate()
  const { clients, documentTypes, obligationTypes, addClient, addDocument, addRegistration, openClientYear } = useData()
  const { show } = useToast()

  const [draft, setDraft] = useState<DraftState>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY)
      return saved ? { ...emptyDraft, ...JSON.parse(saved) } : emptyDraft
    } catch {
      return emptyDraft
    }
  })
  const [resumed] = useState(() => !!localStorage.getItem(DRAFT_KEY))
  const [done, setDone] = useState(false)
  const [newClientId, setNewClientId] = useState<string | null>(null)
  const [createdCount, setCreatedCount] = useState(0)
  const [dir, setDir] = useState(1)

  useEffect(() => {
    if (!done) localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  }, [draft, done])

  function update(patch: Partial<DraftState>) {
    setDraft((d) => ({ ...d, ...patch }))
  }

  function goto(step: number) {
    setDir(step > draft.step ? 1 : -1)
    update({ step })
  }

  const referrer = clients.find((c) => c.id === draft.referrerId) ?? null



  // --- obligations ---------------------------------------------------------

  function toggleObligation(id: string) {
    setDraft((d) => {
      const exists = d.obligations.some((o) => o.obligationTypeId === id)
      if (exists) return { ...d, obligations: d.obligations.filter((o) => o.obligationTypeId !== id) }
      const type = obligationTypes.find((t) => t.id === id)
      return {
        ...d,
        noRegistrations: false,
        obligations: [
          ...d.obligations,
          {
            obligationTypeId: id,
            registrationNumber: '',
            // Default to the start of the selected tax year — the commonest case,
            // and one less field to touch when it is right.
            effectiveDate: `${d.taxYear}-01-01`,
            staggerGroup: type?.periodicity === 'quarterly' ? type.staggerOptions?.[0] : undefined,
            fiscalYearEndMonth: type?.periodicity === 'annual' ? (type.fiscalYearEndMonth ?? 12) : undefined,
          },
        ],
      }
    })
  }

  function patchObligation(obligationTypeId: string, patch: Partial<ObligationDraft>) {
    setDraft((d) => ({
      ...d,
      obligations: d.obligations.map((o) => (o.obligationTypeId === obligationTypeId ? { ...o, ...patch } : o)),
    }))
  }

  /** Generates the preview from draft values via the same code path as the store. */
  const scheduleGroups: ScheduleGroup[] = useMemo(() => {
    return draft.obligations
      .filter((o) => o.effectiveDate)
      .flatMap((o) => {
        const type = obligationTypes.find((t) => t.id === o.obligationTypeId)
        if (!type) return []
        const periodicity = o.periodicity ?? type.periodicity
        const fiscalYearEndMonth = o.fiscalYearEndMonth ?? type.fiscalYearEndMonth
        const pseudo: Registration = {
          id: `draft-${o.obligationTypeId}`,
          clientId: 'draft',
          obligationTypeId: type.id,
          effectiveDate: o.effectiveDate,
          ...deriveFirstPeriod(o.effectiveDate, periodicity, { staggerGroup: o.staggerGroup, fiscalYearEndMonth }),
          periodicity,
          staggerGroup: o.staggerGroup,
          fiscalYearEndMonth,
          status: 'active',
          createdAt: TODAY,
        }
        return [
          {
            key: o.obligationTypeId,
            obligationName: type.name,
            cycle: cycleDescription(periodicity, { staggerGroup: o.staggerGroup, fiscalYearEndMonth }),
            periods: generateFilingPeriods(pseudo, type, draft.taxYear + PERIOD_HORIZON_YEARS),
          },
        ]
      })
  }, [draft.obligations, draft.taxYear, obligationTypes])

  // --- finish --------------------------------------------------------------

  function finish() {
    const created = addClient({
      name: draft.name,
      businessName: draft.businessName || undefined,
      businessType: (draft.businessType || 'other') as BusinessType,
      personType: draft.personType,
      phone: draft.phone || draft.whatsapp,
      whatsapp: draft.whatsapp || undefined,
      email: draft.email || `${draft.name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
      referredById: draft.referrerId ?? undefined,
      subReferredById: draft.subReferrerId ?? undefined,
      status: 'active',
    })

    let count = 0
    for (const o of draft.obligations) {
      if (!o.effectiveDate) continue
      const type = obligationTypes.find((t) => t.id === o.obligationTypeId)
      if (!type) continue

      let certificateDocumentId: string | undefined
      if (o.certificateFileName && type.certificateDocumentTypeId) {
        const doc = addDocument({
          clientId: created.id,
          typeId: type.certificateDocumentTypeId,
          number: o.registrationNumber || undefined,
          issueDate: o.effectiveDate,
          // Tax registration certificates do not expire; the seed uses the same
          // far-future sentinel for dt-vat-cert rows.
          expiryDate: '2099-01-01',
        })
        certificateDocumentId = doc.id
      }

      addRegistration({
        clientId: created.id,
        obligationTypeId: o.obligationTypeId,
        registrationNumber: o.registrationNumber || undefined,
        effectiveDate: o.effectiveDate,
        periodicity: o.periodicity,
        staggerGroup: o.staggerGroup,
        fiscalYearEndMonth: o.fiscalYearEndMonth,
        certificateDocumentId,
      })
      count++
    }

    openClientYear(created.id, draft.taxYear)
    setNewClientId(created.id)
    setCreatedCount(count)
    setDone(true)
    show(`${created.name} added as a client`)
    localStorage.removeItem(DRAFT_KEY)
  }

  function startOver() {
    localStorage.removeItem(DRAFT_KEY)
    setDraft(emptyDraft)
    setNewClientId(null)
    setCreatedCount(0)
    setDone(false)
  }

  // UAE mobile validation for WhatsApp/SMS notifications and reminders
  const whatsappValid = isUaeMobile(draft.whatsapp)
  const skipRegistrations = draft.noRegistrations
  const canProceed = [
    !!draft.name.trim() && whatsappValid,
    draft.obligations.length > 0 || skipRegistrations,
    // Only the effective date is genuinely required — TRN and cycle both have
    // usable defaults or are legitimately unknown at onboarding time.
    draft.obligations.every((o) => !!o.effectiveDate),
    true,
  ][draft.step]

  const lastStep = skipRegistrations ? 1 : STEPS.length - 1
  const totalScheduled = scheduleGroups.reduce((n, g) => n + g.periods.length, 0)

  // --- success -------------------------------------------------------------

  if (done) {
    const suggested = draft.businessType ? SUGGESTED_DOCUMENTS[draft.businessType as BusinessType] : []
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center py-16 text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-success-100 text-success-600 dark:bg-success-500/15"
        >
          <CalendarCheck2 className="h-9 w-9" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <h1 className="mt-5 text-xl font-semibold text-ink-900 dark:text-ink-50">{draft.name} is onboarded 🎉</h1>
          <p className="mt-1.5 text-sm text-ink-500 dark:text-ink-400">
            {createdCount > 0
              ? `Compliance calendar created — ${totalScheduled} filing${totalScheduled === 1 ? '' : 's'} scheduled across ${createdCount} registration${createdCount === 1 ? '' : 's'}, tax year ${draft.taxYear} opened.`
              : 'Added without tax registrations — you can add them from the client profile any time.'}
          </p>
          {referrer && <p className="mt-1 text-xs text-ink-400">Linked under {referrer.name}&rsquo;s referral chain.</p>}
        </motion.div>

        {suggested.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-6 w-full">
            <Card className="p-5 text-left">
              <p className="text-sm font-medium text-ink-800 dark:text-ink-100">
                Documents worth requesting from {draft.name}
              </p>
              <div className="mt-3 flex flex-col gap-2">
                {suggested.map((id) => (
                  <div key={id} className="flex items-center gap-2.5 rounded-lg bg-ink-50 px-3 py-2 text-sm text-ink-700 dark:bg-ink-800 dark:text-ink-200">
                    <div className="h-1.5 w-1.5 rounded-full bg-warning-500" />
                    {documentTypes.find((dt) => dt.id === id)?.name}
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-6 flex gap-3">
          <Button variant="secondary" onClick={startOver}>
            Onboard Another Client
          </Button>
          <Button
            onClick={() => navigate(newClientId ? `/clients/${newClientId}?tab=documents` : '/clients')}
            icon={<ArrowRight className="h-4 w-4" />}
          >
            View Client Profile
          </Button>
        </motion.div>
      </div>
    )
  }

  // --- wizard --------------------------------------------------------------

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900 dark:text-ink-50">Add New Client</h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          Enter the registration once — the filing calendar is worked out for you.
        </p>
      </div>

      {resumed && draft.step > 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-accent-50 px-3.5 py-2.5 text-sm text-accent-700 dark:bg-accent-900/20 dark:text-accent-400">
          <Sparkles className="h-4 w-4" /> Resumed your in-progress draft — nothing was lost.
        </div>
      )}

      <Card className="p-6">
        <Stepper steps={skipRegistrations ? STEPS.slice(0, 2) : STEPS} current={draft.step} />

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
              {/* Step 1 — who ------------------------------------------------ */}
              {draft.step === 0 && (
                <div className="flex flex-col gap-4">
                  <div>
                    <Label>
                      Business name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      placeholder="e.g. Al Falasi Grocery LLC"
                      value={draft.businessName}
                      onChange={(e) => update({ businessName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>
                      Contact person full name
                    </Label>
                    <Input placeholder="e.g. Ahmed Al Falasi" value={draft.name} onChange={(e) => update({ name: e.target.value })} autoFocus />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <Label>
                        WhatsApp <span className="text-red-500">*</span>
                      </Label>
                      <PhoneInput
                        value={draft.whatsapp}
                        onChange={(whatsapp) => update({ whatsapp })}
                        className={cn(draft.whatsapp && !whatsappValid && invalidFieldClass)}
                      />
                      {draft.whatsapp && !whatsappValid && <ErrorText>Use a UAE mobile number, e.g. {UAE_MOBILE_PLACEHOLDER}</ErrorText>}
                    </div>
                    <div>
                      <Label hint="optional">Alternative Phone</Label>
                      <Input
                        type="tel"
                        placeholder="e.g. +971 4 123 4567"
                        value={draft.phone}
                        onChange={(e) => update({ phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label hint="optional">Email</Label>
                    <Input type="email" placeholder="name@example.com" value={draft.email} onChange={(e) => update({ email: e.target.value })} />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <Label>Taxable person</Label>
                      <div className="flex gap-2">
                        {(['legal', 'natural'] as const).map((pt) => (
                          <button
                            key={pt}
                            onClick={() => update({ personType: pt })}
                            className={cn(
                              'flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors',
                              draft.personType === pt
                                ? 'border-accent-500 bg-accent-50 text-accent-700 dark:bg-accent-900/20 dark:text-accent-400'
                                : 'border-ink-200 text-ink-600 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800',
                            )}
                          >
                            {pt === 'legal' ? 'Company' : 'Individual'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label hint="optional">Business type</Label>
                      <Select value={draft.businessType} onChange={(e) => update({ businessType: e.target.value as BusinessType | '' })}>
                        <option value="">Not specified</option>
                        {Object.entries(BUSINESS_TYPE_LABEL).map(([k, label]) => (
                          <option key={k} value={k}>
                            {label}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>

                  {/* Referrer (Level 1) + Sub-Referrer (Level 2). Markup and behaviour
                      are Muhammad Hannan's from origin/master, extracted into
                      ReferralPicker so it can sit inside step 1 instead of owning a
                      whole wizard step. */}
                  <div className="border-t border-ink-100 pt-4 dark:border-ink-800">
                    <ReferralPicker
                      clientName={draft.name}
                      referrerId={draft.referrerId}
                      subReferrerId={draft.subReferrerId}
                      onChange={update}
                    />
                  </div>
                </div>
              )}

              {/* Step 2 — what we handle ------------------------------------- */}
              {draft.step === 1 && (
                <ObligationPicker
                  obligationTypes={obligationTypes}
                  selectedIds={draft.obligations.map((o) => o.obligationTypeId)}
                  onToggle={toggleObligation}
                  taxYear={draft.taxYear}
                  onTaxYearChange={(taxYear) => update({ taxYear })}
                  yearOptions={[CURRENT_TAX_YEAR - 1, CURRENT_TAX_YEAR, CURRENT_TAX_YEAR + 1]}
                  noneSelected={draft.noRegistrations}
                  onSelectNone={() => update({ noRegistrations: !draft.noRegistrations, obligations: [] })}
                />
              )}

              {/* Step 3 — registration details ------------------------------ */}
              {draft.step === 2 && (
                <RegistrationFields drafts={draft.obligations} obligationTypes={obligationTypes} onChange={patchObligation} />
              )}

              {/* Step 4 — confirm, zero inputs ------------------------------- */}
              {draft.step === 3 && <SchedulePreview groups={scheduleGroups} taxYear={draft.taxYear} />}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-8 flex items-center justify-between border-t border-ink-100 pt-5 dark:border-ink-800">
          <Button variant="ghost" onClick={() => goto(Math.max(0, draft.step - 1))} disabled={draft.step === 0} icon={<ArrowLeft className="h-4 w-4" />}>
            Back
          </Button>
          <div className="flex gap-2">
            {draft.step < lastStep ? (
              <span
                title={
                  !canProceed
                    ? draft.step === 0
                      ? 'Enter contact name and a valid UAE WhatsApp/mobile number to continue'
                      : draft.step === 1
                        ? 'Pick what you are handling, or choose "No tax registrations yet"'
                        : 'Enter the effective registration date for each registration'
                    : undefined
                }
              >
                <Button onClick={() => goto(draft.step + 1)} disabled={!canProceed} icon={<ArrowRight className="h-4 w-4" />}>
                  Continue
                </Button>
              </span>
            ) : (
              <span title={!canProceed ? 'Complete the previous steps to finish' : undefined}>
                <Button onClick={finish} disabled={!canProceed}>
                  {createdCount === 0 && scheduleGroups.length > 0 ? 'Create Client & Calendar' : 'Finish Onboarding'}
                </Button>
              </span>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
