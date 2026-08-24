import { useEffect, useMemo, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { ErrorText, Label, Select } from '../ui/Field'
import { RegistrationFields, type ObligationDraft } from '../onboarding/RegistrationFields'
import { useData } from '../../data/store'
import { useToast } from '../../lib/toast'

/**
 * Adds a registration to an existing client.
 *
 * A client acquiring a Corporate Tax registration two years after onboarding is
 * normal, and must not require re-onboarding them. Reuses
 * `RegistrationFields` so the three-field discipline is enforced in one place
 * rather than drifting between the wizard and this modal.
 */
export function AddRegistrationModal({
  open,
  onClose,
  clientId,
}: {
  open: boolean
  onClose: () => void
  clientId: string
}) {
  const { obligationTypes, registrations, addRegistration } = useData()
  const { show } = useToast()
  const [draft, setDraft] = useState<ObligationDraft | null>(null)
  const [showError, setShowError] = useState(false)

  // Obligations this client does not already have — adding a second VAT Return
  // registration to the same client is not a thing. Memoised so the reset effect
  // below can depend on it honestly instead of suppressing the lint warning:
  // registrations only change on submit, which closes the modal anyway.
  const available = useMemo(() => {
    const existing = registrations.filter((r) => r.clientId === clientId).map((r) => r.obligationTypeId)
    return obligationTypes.filter((t) => !existing.includes(t.id))
  }, [registrations, obligationTypes, clientId])

  useEffect(() => {
    if (!open) return
    setShowError(false)
    const first = available[0]
    setDraft(
      first
        ? {
            obligationTypeId: first.id,
            registrationNumber: '',
            effectiveDate: '',
            staggerGroup: first.periodicity === 'quarterly' ? first.staggerOptions?.[0] : undefined,
            fiscalYearEndMonth: first.periodicity === 'annual' ? (first.fiscalYearEndMonth ?? 12) : undefined,
          }
        : null,
    )
  }, [open, clientId, available])

  function pickObligation(id: string) {
    const type = obligationTypes.find((t) => t.id === id)
    setDraft({
      obligationTypeId: id,
      registrationNumber: '',
      effectiveDate: draft?.effectiveDate ?? '',
      staggerGroup: type?.periodicity === 'quarterly' ? type.staggerOptions?.[0] : undefined,
      fiscalYearEndMonth: type?.periodicity === 'annual' ? (type.fiscalYearEndMonth ?? 12) : undefined,
    })
  }

  function submit() {
    if (!draft?.effectiveDate) {
      setShowError(true)
      return
    }
    addRegistration({
      clientId,
      obligationTypeId: draft.obligationTypeId,
      registrationNumber: draft.registrationNumber || undefined,
      effectiveDate: draft.effectiveDate,
      periodicity: draft.periodicity,
      staggerGroup: draft.staggerGroup,
      fiscalYearEndMonth: draft.fiscalYearEndMonth,
    })
    const name = obligationTypes.find((t) => t.id === draft.obligationTypeId)?.name ?? 'Registration'
    show(`${name} added — filing schedule generated`)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Add registration">
      <div className="flex flex-col gap-4">
        {available.length === 0 ? (
          <p className="text-sm text-ink-500 dark:text-ink-400">
            This client already has a registration for every obligation in the catalog. Add a new obligation type in
            Settings to register for something else.
          </p>
        ) : (
          <>
            <div>
              <Label>Obligation</Label>
              <Select value={draft?.obligationTypeId ?? ''} onChange={(e) => pickObligation(e.target.value)}>
                {available.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </div>

            {draft && (
              <RegistrationFields
                drafts={[draft]}
                obligationTypes={obligationTypes}
                onChange={(_, patch) => setDraft((d) => (d ? { ...d, ...patch } : d))}
              />
            )}

            {showError && !draft?.effectiveDate && <ErrorText>Enter the effective registration date.</ErrorText>}
          </>
        )}

        <div className="flex justify-end gap-2 border-t border-ink-100 pt-4 dark:border-ink-800">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          {available.length > 0 && <Button onClick={submit}>Add & Generate Schedule</Button>}
        </div>
      </div>
    </Modal>
  )
}
