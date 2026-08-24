import { useState } from 'react'
import { AlertTriangle, Mail, MessageCircle, MessageSquare } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input, Label, Select, ErrorText, invalidFieldClass } from '../ui/Field'
import { useData } from '../../data/store'
import { staggerLabel } from '../../data/filingPeriods'
import { flattenServices, serviceLabel } from '../../data/serviceTree'
import { useToast } from '../../lib/toast'
import { cn, sleep } from '../../lib/utils'
import type { Channel, DueRule, ObligationType, Periodicity, QuarterStagger } from '../../data/types'

/**
 * Add or edit an obligation in the catalog — the "there are more custom types
 * like this" requirement.
 *
 * Structure follows `NewDocumentTypeModal`, which does the same job for document
 * types, rather than inventing a second pattern. It handles both add and edit
 * because the fields are identical and a separate edit dialog would be the same
 * 200 lines with one prop changed.
 */

const channelIcon: Record<Channel, typeof Mail> = { whatsapp: MessageCircle, email: Mail, sms: MessageSquare }
const channelLabel: Record<Channel, string> = { whatsapp: 'WhatsApp', email: 'Email', sms: 'SMS' }

const PERIODICITY_LABEL: Record<Periodicity, string> = {
  monthly: 'Monthly — 12 filings a year',
  quarterly: 'Quarterly — 4 filings a year',
  annual: 'Annual — 1 filing a year',
  expiry: 'Expiry-driven — no generated periods',
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const ALL_STAGGERS: QuarterStagger[] = ['jan-apr-jul-oct', 'feb-may-aug-nov', 'mar-jun-sep-dec']

/** The three shapes `DueRule` can take, as a flat choice for the picker. */
type DueKind = DueRule['kind']

const DUE_KIND_LABEL: Record<DueKind, string> = {
  'last-day-next-month': 'Last day of the month after the period ends',
  'day-of-next-month': 'A fixed day of the month after the period ends',
  'months-after-period-end': 'A number of months after the period ends',
  'on-expiry': 'On the expiry date itself',
}

interface Draft {
  name: string
  shortName: string
  periodicity: Periodicity
  dueKind: DueKind
  dueDay: string
  dueMonths: string
  staggerOptions: QuarterStagger[]
  fiscalYearEndMonth: number
  serviceId: string
  reminderDays: string
  channels: Channel[]
}

function draftFrom(type: ObligationType | null): Draft {
  if (!type) {
    return {
      name: '',
      shortName: '',
      periodicity: 'quarterly',
      dueKind: 'last-day-next-month',
      dueDay: '28',
      dueMonths: '9',
      staggerOptions: ALL_STAGGERS,
      fiscalYearEndMonth: 12,
      serviceId: '',
      reminderDays: '30, 15, 7, 0',
      channels: ['whatsapp', 'email'],
    }
  }
  return {
    name: type.name,
    shortName: type.shortName,
    periodicity: type.periodicity,
    dueKind: type.dueRule.kind,
    dueDay: String(type.dueRule.kind === 'day-of-next-month' ? type.dueRule.day : 28),
    dueMonths: String(type.dueRule.kind === 'months-after-period-end' ? type.dueRule.months : 9),
    staggerOptions: type.staggerOptions ?? ALL_STAGGERS,
    fiscalYearEndMonth: type.fiscalYearEndMonth ?? 12,
    serviceId: type.serviceId ?? '',
    reminderDays: type.defaultReminderDays.join(', '),
    channels: type.defaultChannels,
  }
}

function dueRuleFrom(draft: Draft): DueRule {
  if (draft.dueKind === 'day-of-next-month') {
    // Clamped to 28: a rule saying "the 31st" silently means "the 30th" in April
    // and "the 28th" in February, so the only honest fixed day is one that exists
    // in every month.
    return { kind: 'day-of-next-month', day: Math.min(28, Math.max(1, parseInt(draft.dueDay) || 28)) }
  }
  if (draft.dueKind === 'months-after-period-end') {
    return { kind: 'months-after-period-end', months: Math.max(1, parseInt(draft.dueMonths) || 9) }
  }
  if (draft.dueKind === 'on-expiry') return { kind: 'on-expiry' }
  return { kind: 'last-day-next-month' }
}

export function ObligationTypeModal({
  open,
  onClose,
  editing,
}: {
  open: boolean
  onClose: () => void
  /** null = add a new obligation. */
  editing: ObligationType | null
}) {
  const { services, addObligationType, updateObligationType, registrationsUsingObligation } = useData()
  const { show } = useToast()
  // Keyed remount from the caller supplies the initial draft, so there is no
  // reset-on-open effect to get out of step with the dialog.
  const [draft, setDraft] = useState<Draft>(() => draftFrom(editing))
  const [showErrors, setShowErrors] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }))

  const nameError = !draft.name.trim() ? 'Name is required' : null
  const staggerError =
    draft.periodicity === 'quarterly' && draft.staggerOptions.length === 0
      ? 'Pick at least one stagger group — a quarterly filer has to sit in one of them'
      : null

  const inUse = editing ? registrationsUsingObligation(editing.id) : []
  const cycleChanged =
    !!editing && (draft.periodicity !== editing.periodicity || dueRuleFrom(draft).kind !== editing.dueRule.kind)
  const dueRuleValueChanged =
    !!editing &&
    JSON.stringify(dueRuleFrom(draft)) !== JSON.stringify(editing.dueRule)

  function toggleChannel(ch: Channel) {
    set('channels', draft.channels.includes(ch) ? draft.channels.filter((c) => c !== ch) : [...draft.channels, ch])
  }

  function toggleStagger(g: QuarterStagger) {
    set('staggerOptions', draft.staggerOptions.includes(g) ? draft.staggerOptions.filter((x) => x !== g) : [...draft.staggerOptions, g])
  }

  async function submit() {
    if (nameError || staggerError) {
      setShowErrors(true)
      return
    }
    setSubmitting(true)
    await sleep(400 + Math.random() * 200)

    const payload = {
      name: draft.name.trim(),
      // Falls back to the first word of the name — the short name only exists to
      // fit in a badge, and making it mandatory buys nothing.
      shortName: draft.shortName.trim() || draft.name.trim().split(/\s+/)[0],
      periodicity: draft.periodicity,
      dueRule: dueRuleFrom(draft),
      staggerOptions: draft.periodicity === 'quarterly' ? draft.staggerOptions : undefined,
      fiscalYearEndMonth: draft.periodicity === 'annual' ? draft.fiscalYearEndMonth : undefined,
      serviceId: draft.serviceId || undefined,
      defaultReminderDays: draft.reminderDays
        .split(',')
        .map((v) => parseInt(v.trim()))
        .filter((n) => !isNaN(n) && n >= 0),
      defaultChannels: draft.channels,
    }

    if (editing) {
      updateObligationType(editing.id, payload)
      show(
        inUse.length > 0 && dueRuleValueChanged
          ? `${payload.name} updated — ${inUse.length} registration${inUse.length === 1 ? '' : 's'} rescheduled`
          : `${payload.name} updated`,
      )
    } else {
      addObligationType(payload)
      show(`${payload.name} added to the obligation catalog`)
    }
    setSubmitting(false)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? `Edit ${editing.name}` : 'Add Obligation'}
      width="max-w-xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} loading={submitting}>
            {editing ? 'Save Changes' : 'Add Obligation'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {editing?.builtIn && (
          <p className="rounded-lg bg-ink-50 px-3.5 py-2.5 text-xs text-ink-500 dark:bg-ink-800 dark:text-ink-400">
            This is a built-in obligation. It can be edited — the VAT due date rule is genuinely ambiguous and a firm
            may need to change it — but it cannot be deleted.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <div>
            <Label>Name</Label>
            <Input
              placeholder="e.g. Municipality Return"
              value={draft.name}
              onChange={(e) => set('name', e.target.value)}
              className={cn(showErrors && nameError && invalidFieldClass)}
              autoFocus
            />
            {showErrors && nameError && <ErrorText>{nameError}</ErrorText>}
          </div>
          <div>
            <Label hint="for badges">Short name</Label>
            <Input placeholder="e.g. MUN" value={draft.shortName} onChange={(e) => set('shortName', e.target.value)} />
          </div>
        </div>

        <div>
          <Label>Filing cycle</Label>
          <Select value={draft.periodicity} onChange={(e) => set('periodicity', e.target.value as Periodicity)}>
            {(['monthly', 'quarterly', 'annual'] as Periodicity[]).map((p) => (
              <option key={p} value={p}>
                {PERIODICITY_LABEL[p]}
              </option>
            ))}
          </Select>
        </div>

        {draft.periodicity === 'quarterly' && (
          <div>
            <Label hint={`${draft.staggerOptions.length} of 3`}>Tax period groups offered</Label>
            <p className="-mt-0.5 mb-2 text-xs text-ink-500 dark:text-ink-400">
              UAE quarterly filing is staggered — the authority assigns one of three groups, and it is not calendar
              Q1–Q4. Leave all three on unless this obligation only uses some.
            </p>
            <div className="flex flex-col gap-2">
              {ALL_STAGGERS.map((g) => {
                const active = draft.staggerOptions.includes(g)
                return (
                  <button
                    key={g}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleStagger(g)}
                    className={cn(
                      'rounded-lg border px-3.5 py-2.5 text-left text-sm transition-colors',
                      active
                        ? 'border-accent-500 bg-accent-50 text-accent-700 dark:bg-accent-900/20 dark:text-accent-400'
                        : 'border-ink-200 text-ink-500 hover:bg-ink-50 dark:border-ink-700 dark:hover:bg-ink-800',
                    )}
                  >
                    {staggerLabel(g)}
                  </button>
                )
              })}
            </div>
            {showErrors && staggerError && <ErrorText>{staggerError}</ErrorText>}
          </div>
        )}

        {draft.periodicity === 'annual' && (
          <div>
            <Label>Financial year ends</Label>
            <Select value={String(draft.fiscalYearEndMonth)} onChange={(e) => set('fiscalYearEndMonth', Number(e.target.value))}>
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  End of {m}
                </option>
              ))}
            </Select>
          </div>
        )}

        <div>
          <Label>Due date rule</Label>
          <Select value={draft.dueKind} onChange={(e) => set('dueKind', e.target.value as DueKind)}>
            {(['last-day-next-month', 'day-of-next-month', 'months-after-period-end'] as DueKind[]).map((k) => (
              <option key={k} value={k}>
                {DUE_KIND_LABEL[k]}
              </option>
            ))}
          </Select>
          {draft.dueKind === 'day-of-next-month' && (
            <div className="mt-2">
              <Label hint="1–28">Day of the following month</Label>
              <Input type="number" min={1} max={28} value={draft.dueDay} onChange={(e) => set('dueDay', e.target.value)} />
            </div>
          )}
          {draft.dueKind === 'months-after-period-end' && (
            <div className="mt-2">
              <Label>Months after the period ends</Label>
              <Input type="number" min={1} max={24} value={draft.dueMonths} onChange={(e) => set('dueMonths', e.target.value)} />
            </div>
          )}
        </div>

        <div>
          <Label hint="optional">Billed as</Label>
          <Select value={draft.serviceId} onChange={(e) => set('serviceId', e.target.value)}>
            <option value="">No linked service</option>
            {flattenServices(services).map(({ service: s }) => (
              <option key={s.id} value={s.id}>
                {serviceLabel(s, services)}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-ink-400">
            Used when a matter is opened from one of these filings — it sets the checklist and what the work bills at.
          </p>
        </div>

        <div>
          <Label hint="comma separated days, 0 = on the day">Default reminder schedule</Label>
          <Input value={draft.reminderDays} onChange={(e) => set('reminderDays', e.target.value)} placeholder="e.g. 60, 30, 15, 7, 0" />
        </div>

        <div>
          <Label>Default channels</Label>
          <div className="flex gap-2">
            {(['whatsapp', 'email', 'sms'] as Channel[]).map((ch) => {
              const Icon = channelIcon[ch]
              const active = draft.channels.includes(ch)
              return (
                <button
                  key={ch}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleChannel(ch)}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-colors',
                    active
                      ? 'border-accent-500 bg-accent-50 text-accent-700 dark:bg-accent-900/20 dark:text-accent-400'
                      : 'border-ink-200 text-ink-500 dark:border-ink-700',
                  )}
                >
                  <Icon className="h-4 w-4" /> {channelLabel[ch]}
                </button>
              )
            })}
          </div>
        </div>

        {inUse.length > 0 && (cycleChanged || dueRuleValueChanged) && (
          <div className="flex items-start gap-2.5 rounded-lg bg-warning-50 px-3.5 py-3 text-xs text-warning-800 dark:bg-warning-500/10 dark:text-warning-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">
                {inUse.length} registration{inUse.length === 1 ? '' : 's'} will be rescheduled.
              </p>
              <p className="mt-0.5">
                Future periods are regenerated from the new rule. Filed and billed periods keep the dates they were
                filed under — those are what went to the authority and are never rewritten.
              </p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
