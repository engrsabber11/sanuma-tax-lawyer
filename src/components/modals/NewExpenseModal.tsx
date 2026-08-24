import { useEffect, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input, Label, Select, ErrorText, invalidFieldClass } from '../ui/Field'
import { Switch } from '../ui/Switch'
import { useData } from '../../data/store'
import { useToast } from '../../lib/toast'
import { cn, sleep, todayIso } from '../../lib/utils'
import type { Expense } from '../../data/types'

const CATEGORIES = ['Office Rent', 'Software', 'Government Fees', 'Marketing', 'Salaries', 'Utilities', 'Professional Fees', 'Other']

export function NewExpenseModal({
  open,
  onClose,
  expense,
}: {
  open: boolean
  onClose: () => void
  expense?: Expense | null
}) {
  const { clients, addExpense, updateExpense } = useData()
  const { show } = useToast()
  const isEditing = !!expense

  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [amount, setAmount] = useState(0)
  const [date, setDate] = useState(todayIso)
  const [isDisbursement, setIsDisbursement] = useState(false)
  const [clientId, setClientId] = useState('')
  const [billed, setBilled] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      if (expense) {
        setDescription(expense.description)
        setCategory(expense.category)
        setAmount(expense.amount)
        setDate(expense.date)
        setIsDisbursement(expense.isDisbursement)
        setClientId(expense.clientId ?? clients[0]?.id ?? '')
        setBilled(expense.billed ?? false)
      } else {
        setDescription('')
        setCategory(CATEGORIES[0])
        setAmount(0)
        setDate(todayIso())
        setIsDisbursement(false)
        setClientId(clients[0]?.id ?? '')
        setBilled(false)
      }
      setShowErrors(false)
    }
  }, [open, expense, clients])

  const descriptionError = !description.trim() ? 'Description is required' : null
  const amountError = amount <= 0 ? 'Amount must be greater than zero' : null

  async function submit() {
    if (descriptionError || amountError) {
      setShowErrors(true)
      return
    }
    setSubmitting(true)
    await sleep(300 + Math.random() * 150)

    if (isEditing && expense) {
      updateExpense(expense.id, {
        description,
        category,
        amount,
        date,
        isDisbursement,
        clientId: isDisbursement ? clientId : undefined,
        billed: isDisbursement ? billed : false,
      })
      show('Expense updated')
    } else {
      addExpense({
        description,
        category,
        amount,
        date,
        isDisbursement,
        clientId: isDisbursement ? clientId : undefined,
        billed: isDisbursement ? billed : false,
      })
      show('Expense added')
    }

    setSubmitting(false)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Expense' : 'Add Expense'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} loading={submitting}>
            {isEditing ? 'Save Changes' : 'Add Expense'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Category</Label>
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Amount (AED)</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className={cn(showErrors && amountError && invalidFieldClass)}
            />
            {showErrors && amountError && <ErrorText>{amountError}</ErrorText>}
          </div>
        </div>
        <div>
          <Label>Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <Label>Description</Label>
          <Input
            placeholder="e.g. DED trade license renewal fee"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={cn(showErrors && descriptionError && invalidFieldClass)}
          />
          {showErrors && descriptionError && <ErrorText>{descriptionError}</ErrorText>}
        </div>
        <div className="flex items-center justify-between rounded-lg border border-ink-200/70 px-3.5 py-2.5 dark:border-ink-800">
          <div>
            <p className="text-sm font-medium text-ink-700 dark:text-ink-200">Client Disbursement</p>
            <p className="text-xs text-ink-400">Paid on behalf of a client, to be re-billed</p>
          </div>
          <Switch checked={isDisbursement} onChange={() => setIsDisbursement((v) => !v)} />
        </div>
        {isDisbursement && (
          <>
            <div>
              <Label>Client / Business</Label>
              <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.businessName ? `${c.businessName} (${c.name})` : c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-ink-200/70 px-3.5 py-2.5 dark:border-ink-800">
              <div>
                <p className="text-sm font-medium text-ink-700 dark:text-ink-200">Already billed to client</p>
                <p className="text-xs text-ink-400">Mark as included on a client invoice</p>
              </div>
              <Switch checked={billed} onChange={() => setBilled((v) => !v)} />
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
