import { useEffect, useMemo, useState } from 'react'
import {
  CalendarClock,
  Check,
  CircleSlash,
  FileText,
  History,
  Lock,
  LockOpen,
  Pencil,
  Plus,
  RotateCcw,
} from 'lucide-react'
import { Card, CardBody, CardHeader, CardTitle } from '../ui/Card'
import { Modal } from '../ui/Modal'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Input, Label, Select } from '../ui/Field'
import { EmptyState } from '../ui/EmptyState'
import { AddRegistrationModal } from '../modals/AddRegistrationModal'
import { ReopenYearModal } from '../modals/ReopenYearModal'
import { SchedulePreview, type ScheduleGroup } from '../onboarding/SchedulePreview'
import { useData, TODAY } from '../../data/store'
import { cycleDescription, staggerLabel } from '../../data/filingPeriods'
import { useToast } from '../../lib/toast'
import type { FilingPeriod, QuarterStagger, Registration } from '../../data/types'
import { formatDate } from '../../lib/utils'

/**
 * A client's registrations, their generated schedules, and the open/closed state
 * of each tax year.
 *
 * Reuses `SchedulePreview` from onboarding in its stateful mode — the same table
 * the lawyer confirmed at onboarding is the one they work from afterwards.
 */
export function ClientComplianceTab({ clientId, clientName }: { clientId: string; clientName: string }) {
  const {
    obligationTypes,
    registrations,
    filingPeriods,
    clientYears,
    clientDocuments,
    documentTypes,
    auditLog,
    markFilingFiled,
    markFilingNotRequired,
    revertFilingToPending,
    closeClientYear,
    openClientYear,
    canCloseClientYear,
  } = useData()
  const { show } = useToast()

  const clientRegs = useMemo(() => registrations.filter((r) => r.clientId === clientId), [registrations, clientId])
  const clientPeriods = useMemo(() => filingPeriods.filter((p) => p.clientId === clientId), [filingPeriods, clientId])
  const clientAudit = useMemo(
    () => auditLog.filter((a) => a.clientId === clientId).slice().reverse(),
    [auditLog, clientId],
  )

  const years = useMemo(() => {
    const set = new Set(clientPeriods.map((p) => p.taxYear))
    set.add(Number(TODAY.slice(0, 4)))
    return [...set].sort((a, b) => b - a)
  }, [clientPeriods])

  const [taxYear, setTaxYear] = useState(() => Number(TODAY.slice(0, 4)))
  const [addOpen, setAddOpen] = useState(false)
  const [reopenOpen, setReopenOpen] = useState(false)
  const [editing, setEditing] = useState<Registration | null>(null)

  const year = clientYears.find((y) => y.clientId === clientId && y.taxYear === taxYear)
  const closed = year?.status === 'closed'
  const closeCheck = canCloseClientYear(clientId, taxYear)

  const inYear = clientPeriods.filter((p) => p.taxYear === taxYear)
  const filed = inYear.filter((p) => p.state === 'filed').length
  const pending = inYear.filter((p) => p.state === 'pending').length
  const notRequired = inYear.filter((p) => p.state === 'not-required').length

  const groups: ScheduleGroup[] = clientRegs.map((r) => {
    const type = obligationTypes.find((t) => t.id === r.obligationTypeId)
    return {
      key: r.id,
      obligationName: type?.name ?? 'Filing',
      cycle: cycleDescription(r.periodicity, {
        staggerGroup: r.staggerGroup,
        fiscalYearEndMonth: r.fiscalYearEndMonth,
      }),
      periods: clientPeriods.filter((p) => p.registrationId === r.id),
    }
  })

  if (clientRegs.length === 0) {
    return (
      <>
        <Card>
          <EmptyState
            icon={<CalendarClock className="h-5 w-5" />}
            title="No tax registrations"
            description="Add a VAT, Corporate Tax or other registration and the filing schedule is generated from it."
            action={<Button onClick={() => setAddOpen(true)} icon={<Plus className="h-4 w-4" />}>Add Registration</Button>}
          />
        </Card>
        <AddRegistrationModal open={addOpen} onClose={() => setAddOpen(false)} clientId={clientId} />
      </>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Year header ------------------------------------------------------- */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-ink-500 dark:text-ink-400">Tax year</span>
            <Select className="w-28" value={String(taxYear)} onChange={(e) => setTaxYear(Number(e.target.value))}>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
          </div>

          <Badge tone={closed ? 'neutral' : 'accent'}>
            {closed ? (
              <>
                <Lock className="mr-1 inline h-3 w-3" />
                Closed
              </>
            ) : (
              <>
                <LockOpen className="mr-1 inline h-3 w-3" />
                Open
              </>
            )}
          </Badge>

          <p className="text-xs text-ink-500 dark:text-ink-400">
            {inYear.length} filing{inYear.length === 1 ? '' : 's'} · {filed} filed · {pending} outstanding
            {notRequired > 0 && <> · {notRequired} n/a</>}
          </p>

          <div className="ml-auto flex items-center gap-2">
            {!closed && !year && (
              <Button variant="secondary" onClick={() => openClientYear(clientId, taxYear)}>
                Open Year
              </Button>
            )}
            {closed ? (
              <Button variant="secondary" onClick={() => setReopenOpen(true)} icon={<LockOpen className="h-4 w-4" />}>
                Reopen Year
              </Button>
            ) : (
              <span
                title={
                  closeCheck.ok
                    ? undefined
                    : `${closeCheck.pendingCount} filing${closeCheck.pendingCount === 1 ? '' : 's'} still outstanding`
                }
              >
                <Button
                  variant="secondary"
                  disabled={!closeCheck.ok || inYear.length === 0}
                  onClick={() => {
                    closeClientYear(clientId, taxYear)
                    show(`Tax year ${taxYear} closed`)
                  }}
                  icon={<Lock className="h-4 w-4" />}
                >
                  Close Year
                </Button>
              </span>
            )}
          </div>
        </div>

        {closed && (
          <p className="mt-3 border-t border-ink-100 pt-3 text-xs text-ink-500 dark:border-ink-800 dark:text-ink-400">
            Closed {year?.closedAt ? formatDate(year.closedAt) : ''} — filings in this year are read-only.
            {year?.reopenReason && <> Previously reopened: &ldquo;{year.reopenReason}&rdquo;</>}
          </p>
        )}
        {!closed && !closeCheck.ok && inYear.length > 0 && (
          <p className="mt-3 border-t border-ink-100 pt-3 text-xs text-ink-500 dark:border-ink-800 dark:text-ink-400">
            {closeCheck.pendingCount} filing{closeCheck.pendingCount === 1 ? '' : 's'} still outstanding — a year cannot
            close over unfiled returns.
          </p>
        )}
      </Card>

      {/* Registrations ----------------------------------------------------- */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink-800 dark:text-ink-100">
          Registrations ({clientRegs.length})
        </h2>
        <Button variant="secondary" onClick={() => setAddOpen(true)} icon={<Plus className="h-4 w-4" />}>
          Add Registration
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {clientRegs.map((r) => (
          <RegistrationCard
            key={r.id}
            registration={r}
            obligationName={obligationTypes.find((t) => t.id === r.obligationTypeId)?.name ?? 'Registration'}
            certificateName={
              r.certificateDocumentId
                ? documentTypes.find(
                    (t) => t.id === clientDocuments.find((d) => d.id === r.certificateDocumentId)?.typeId,
                  )?.name
                : undefined
            }
            periodCount={clientPeriods.filter((p) => p.registrationId === r.id).length}
            onEdit={() => setEditing(r)}
          />
        ))}
      </div>

      {/* Schedule ---------------------------------------------------------- */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-ink-800 dark:text-ink-100">Filing schedule</h2>
        <SchedulePreview groups={groups} showState />
      </div>

      {/* Per-year actions -------------------------------------------------- */}
      {inYear.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{taxYear} filings</CardTitle>
            {closed && <span className="text-xs text-ink-400">read-only while the year is closed</span>}
          </CardHeader>
          <CardBody className="pt-1">
            <div className="divide-y divide-ink-100 dark:divide-ink-800">
              {inYear
                .slice()
                .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
                .map((p) => (
                  <YearFilingRow
                    key={p.id}
                    period={p}
                    obligationName={obligationTypes.find((t) => t.id === p.obligationTypeId)?.name ?? 'Filing'}
                    locked={closed}
                    onMarkFiled={() => {
                      markFilingFiled(p.id)
                      show(`${p.label} marked filed`)
                    }}
                    onMarkNotRequired={() => {
                      markFilingNotRequired(p.id)
                      show(`${p.label} marked not required`)
                    }}
                    onRevert={() => {
                      revertFilingToPending(p.id)
                      show(`${p.label} reopened for amendment`)
                    }}
                  />
                ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Audit trail ------------------------------------------------------- */}
      {clientAudit.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              <History className="mr-1.5 inline h-4 w-4 text-ink-400" />
              Compliance history
            </CardTitle>
          </CardHeader>
          <CardBody className="pt-1">
            <div className="flex flex-col gap-2.5">
              {clientAudit.map((a) => (
                <div key={a.id} className="flex gap-3 text-sm">
                  <span className="w-24 shrink-0 text-xs text-ink-400">{formatDate(a.at.slice(0, 10))}</span>
                  <span className="min-w-0">
                    <span className="text-ink-800 dark:text-ink-100">
                      {AUDIT_LABEL[a.action]} — {a.subject}
                    </span>
                    {a.note && <span className="block text-xs text-ink-500 dark:text-ink-400">&ldquo;{a.note}&rdquo;</span>}
                    <span className="block text-xs text-ink-400">by {a.actor}</span>
                  </span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      <AddRegistrationModal open={addOpen} onClose={() => setAddOpen(false)} clientId={clientId} />
      <ReopenYearModal
        open={reopenOpen}
        onClose={() => setReopenOpen(false)}
        clientId={clientId}
        clientName={clientName}
        taxYear={taxYear}
      />
      <EditRegistrationModal registration={editing} onClose={() => setEditing(null)} />
    </div>
  )
}

const AUDIT_LABEL: Record<string, string> = {
  'year-closed': 'Tax year closed',
  'year-reopened': 'Tax year reopened',
  'registration-edited': 'Registration edited',
  'filing-reverted': 'Filing reopened for amendment',
}

function RegistrationCard({
  registration,
  obligationName,
  certificateName,
  periodCount,
  onEdit,
}: {
  registration: Registration
  obligationName: string
  certificateName?: string
  periodCount: number
  onEdit: () => void
}) {
  const r = registration
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-ink-800 dark:text-ink-100">{obligationName}</p>
            {r.status === 'deregistered' && <Badge tone="warning" size="sm">deregistered</Badge>}
          </div>
          <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">
            {cycleDescription(r.periodicity, { staggerGroup: r.staggerGroup, fiscalYearEndMonth: r.fiscalYearEndMonth })}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-500 dark:text-ink-400">
            {r.registrationNumber && (
              <span>
                TRN <span className="font-medium text-ink-700 dark:text-ink-200">{r.registrationNumber}</span>
              </span>
            )}
            <span>
              Effective <span className="font-medium text-ink-700 dark:text-ink-200">{formatDate(r.effectiveDate)}</span>
            </span>
            <span>
              First period {formatDate(r.firstPeriodStart)} – {formatDate(r.firstPeriodEnd)}
            </span>
            <span>{periodCount} periods generated</span>
          </div>
          {certificateName && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-success-600 dark:text-success-500">
              <FileText className="h-3.5 w-3.5" /> {certificateName} attached
            </p>
          )}
        </div>
        <Button variant="ghost" onClick={onEdit} icon={<Pencil className="h-3.5 w-3.5" />}>
          Edit
        </Button>
      </div>
    </Card>
  )
}

function YearFilingRow({
  period,
  obligationName,
  locked,
  onMarkFiled,
  onMarkNotRequired,
  onRevert,
}: {
  period: FilingPeriod
  obligationName: string
  locked: boolean
  onMarkFiled: () => void
  onMarkNotRequired: () => void
  onRevert: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-ink-800 dark:text-ink-100">
          {obligationName} — {period.label}
        </p>
        <p className="text-xs text-ink-400">Due {formatDate(period.dueDate)}</p>
      </div>
      <Badge
        tone={period.state === 'filed' ? 'success' : period.state === 'not-required' ? 'neutral' : 'warning'}
        size="sm"
      >
        {period.state === 'filed' ? 'filed' : period.state === 'not-required' ? 'n/a' : 'outstanding'}
      </Badge>
      {!locked && (
        <div className="flex shrink-0 gap-1">
          {period.state === 'pending' ? (
            <>
              <IconAction icon={<Check className="h-3.5 w-3.5" />} label="Mark filed" onClick={onMarkFiled} />
              <IconAction
                icon={<CircleSlash className="h-3.5 w-3.5" />}
                label="Mark not required"
                onClick={onMarkNotRequired}
              />
            </>
          ) : (
            <IconAction
              icon={<RotateCcw className="h-3.5 w-3.5" />}
              label="Reopen for amendment"
              onClick={onRevert}
            />
          )}
        </div>
      )}
    </div>
  )
}

function IconAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-700 dark:hover:text-ink-200"
    >
      {icon}
    </button>
  )
}

/**
 * Editing a registration reschedules its future periods. The dialog states the
 * counts before saving — Phase 2's regeneration already protects filed history,
 * but the lawyer should be told, not surprised.
 */
function EditRegistrationModal({
  registration,
  onClose,
}: {
  registration: Registration | null
  onClose: () => void
}) {
  const { obligationTypes, filingPeriods, updateRegistration, regeneratePeriodsFor, deregisterRegistration } = useData()
  const { show } = useToast()
  const [effectiveDate, setEffectiveDate] = useState('')
  const [registrationNumber, setRegistrationNumber] = useState('')
  const [staggerGroup, setStaggerGroup] = useState<QuarterStagger | undefined>(undefined)

  const open = !!registration
  const type = registration ? obligationTypes.find((t) => t.id === registration.obligationTypeId) : undefined

  useEffect(() => {
    if (registration) {
      setEffectiveDate(registration.effectiveDate)
      setRegistrationNumber(registration.registrationNumber ?? '')
      setStaggerGroup(registration.staggerGroup)
    }
  }, [registration])

  if (!registration || !type) return null

  const mine = filingPeriods.filter((p) => p.registrationId === registration.id)
  const lockedCount = mine.filter((p) => p.state === 'filed' || p.matterId || p.invoiceId).length
  const futureCount = mine.length - lockedCount
  const anchorChanged = effectiveDate !== registration.effectiveDate || staggerGroup !== registration.staggerGroup

  function save() {
    updateRegistration(registration!.id, {
      effectiveDate,
      registrationNumber: registrationNumber || undefined,
      staggerGroup,
    })
    regeneratePeriodsFor(registration!.id)
    show(`${type!.name} updated — schedule regenerated`)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={`Edit ${type.name}`}>
      <div className="flex flex-col gap-4">
        <div>
          <Label hint="optional">Tax Registration Number</Label>
          <Input value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} />
        </div>
        <div>
          <Label>Effective Registration Date</Label>
          <Input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
        </div>
        {type.periodicity === 'quarterly' && (
          <div>
            <Label>Tax periods</Label>
            <Select value={staggerGroup ?? ''} onChange={(e) => setStaggerGroup(e.target.value as QuarterStagger)}>
              {(type.staggerOptions ?? []).map((g) => (
                <option key={g} value={g}>
                  {staggerLabel(g)}
                </option>
              ))}
            </Select>
          </div>
        )}

        {anchorChanged && (
          <div className="rounded-lg bg-warning-50 px-3.5 py-3 text-xs text-warning-800 dark:bg-warning-500/10 dark:text-warning-300">
            {futureCount} future period{futureCount === 1 ? '' : 's'} will be rescheduled.{' '}
            {lockedCount > 0 ? (
              <>
                {lockedCount} filed or billed period{lockedCount === 1 ? '' : 's'} {lockedCount === 1 ? 'is' : 'are'}{' '}
                unaffected — their dates are what was filed with the FTA and are never rewritten.
              </>
            ) : (
              'Nothing has been filed or billed yet, so no history is at risk.'
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 border-t border-ink-100 pt-4 dark:border-ink-800">
          {registration.status === 'active' ? (
            <button
              onClick={() => {
                deregisterRegistration(registration.id, effectiveDate)
                show(`${type.name} marked deregistered`)
                onClose()
              }}
              className="text-xs font-medium text-danger-600 hover:underline dark:text-danger-500"
            >
              Mark deregistered
            </button>
          ) : (
            <span className="text-xs text-ink-400">Deregistered {registration.deregisteredAt ? formatDate(registration.deregisteredAt) : ''}</span>
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={save} disabled={!effectiveDate}>
              Save
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
