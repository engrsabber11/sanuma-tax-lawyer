import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Building, Building2, Eye, EyeOff, Info, Lock, Mail, Users, UserCheck } from 'lucide-react'
import { Avatar } from '../components/ui/Avatar'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ErrorText, Input, Label, invalidFieldClass } from '../components/ui/Field'
import { useData } from '../data/store'
import { demoPasswordFor } from '../data/demoCredentials'
import { ROLE_DESCRIPTION, ROLE_LABEL, ROLE_PERMISSIONS, type Permission } from '../data/permissions'
import { cn, sleep } from '../lib/utils'
import type { Client, StaffRole, StaffUser } from '../data/types'

/** The capabilities worth naming — the ones that actually differ between roles. */
const HIGHLIGHTS: { permission: Permission; label: string }[] = [
  { permission: 'filing.file', label: 'File returns' },
  { permission: 'invoice.create', label: 'Issue invoices' },
  { permission: 'penalty.waive', label: 'Waive fees' },
  { permission: 'accounting.view', label: "Firm's books" },
  { permission: 'config.write', label: 'Settings & catalog' },
]

const ROLE_TONE: Record<StaffRole, 'accent' | 'success' | 'neutral'> = {
  partner: 'accent',
  consultant: 'success',
  assistant: 'neutral',
}

export function LoginPage() {
  const { staffMembers, clients, firmProfile, signInWithCredentials } = useData()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [reveal, setReveal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [personaTab, setPersonaTab] = useState<'staff' | 'client'>('staff')
  /** Which card was used to fill the form, so the choice stays visible. */
  const [filledId, setFilledId] = useState<string | null>(null)

  const demoClients = clients.slice(0, 3)

  function fillFromStaff(staff: StaffUser) {
    setEmail(staff.email)
    setPassword(demoPasswordFor(staff.id))
    setFilledId(staff.id)
    setError(null)
  }

  function fillFromClient(client: Client) {
    setEmail(client.email)
    setPassword(demoPasswordFor(client.id))
    setFilledId(client.id)
    setError(null)
  }

  async function submit() {
    if (!email.trim() || !password) {
      setError('Enter both an email address and a password.')
      return
    }
    setSubmitting(true)
    setError(null)
    // A beat, so a refusal reads as a refusal rather than a flicker.
    await sleep(350)
    const result = signInWithCredentials(email, password)
    if (!result.ok) {
      setError(result.reason ?? 'Sign-in failed.')
      setSubmitting(false)
      return
    }
    navigate('/', { replace: true })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4 py-10 dark:bg-ink-950">
      <div className="w-full max-w-5xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-600 text-white">
            <Building className="h-7 w-7" />
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink-900 dark:text-ink-50">
            {firmProfile.name}
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Sign in to the practice &amp; client workspace</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
          {/* ---------------------------------------------------- the form */}
          <Card className="h-fit p-6">
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault()
                void submit()
              }}
            >
              <div>
                <Label>Email address</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <Input
                    type="email"
                    autoComplete="username"
                    placeholder="you@sanuma-tax.ae"
                    className={cn('pl-9', error && invalidFieldClass)}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      setError(null)
                    }}
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <Label>Password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <Input
                    type={reveal ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className={cn('pl-9 pr-10', error && invalidFieldClass)}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      setError(null)
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setReveal((v) => !v)}
                    aria-label={reveal ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-600 dark:hover:bg-ink-800"
                  >
                    {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && <ErrorText>{error}</ErrorText>}

              <Button type="submit" loading={submitting} className="mt-1 w-full justify-center">
                Sign In
              </Button>

              <div className="flex items-start gap-2.5 rounded-lg bg-ink-50 px-3.5 py-3 text-xs text-ink-500 dark:bg-ink-800/60 dark:text-ink-400">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <p>
                  <span className="font-medium text-ink-700 dark:text-ink-200">Demo credentials.</span> Click any
                  card on the right (Staff or Client) to automatically fill in the form and test that persona&apos;s workspace.
                </p>
              </div>
            </form>
          </Card>

          {/* ------------------------------------------ click-to-fill users */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">
                Sign in as — click to fill the form
              </p>

              {/* Persona Segmented Toggle */}
              <div className="flex rounded-lg border border-ink-200 bg-ink-100/60 p-0.5 dark:border-ink-700 dark:bg-ink-800/60">
                <button
                  type="button"
                  onClick={() => setPersonaTab('staff')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors',
                    personaTab === 'staff'
                      ? 'bg-white text-ink-900 shadow-sm dark:bg-ink-900 dark:text-ink-50'
                      : 'text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-200',
                  )}
                >
                  <Users className="h-3.5 w-3.5" />
                  Firm Team ({staffMembers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPersonaTab('client')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors',
                    personaTab === 'client'
                      ? 'bg-white text-ink-900 shadow-sm dark:bg-ink-900 dark:text-ink-50'
                      : 'text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-200',
                  )}
                >
                  <Building2 className="h-3.5 w-3.5" />
                  Client Portal ({demoClients.length})
                </button>
              </div>
            </div>

            {/* Staff Cards */}
            {personaTab === 'staff' && (
              <div className="flex flex-col gap-3">
                {staffMembers.map((staff) => {
                  const granted = ROLE_PERMISSIONS[staff.role]
                  const isFilled = filledId === staff.id
                  return (
                    <Card
                      key={staff.id}
                      className={cn(
                        'overflow-hidden p-0 transition-all hover:border-accent-400',
                        isFilled && 'border-accent-500 ring-2 ring-accent-500/20',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => fillFromStaff(staff)}
                        className="group flex w-full flex-col gap-2.5 p-4 text-left transition-colors hover:bg-accent-50/60 dark:hover:bg-accent-900/15"
                      >
                        <div className="flex w-full items-center gap-3">
                          <Avatar name={staff.name} color={staff.avatarColor} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-ink-900 dark:text-ink-50">{staff.name}</p>
                            <p className="truncate text-xs text-ink-400">{staff.email}</p>
                          </div>
                          <Badge tone={ROLE_TONE[staff.role]} size="sm">
                            {ROLE_LABEL[staff.role]}
                          </Badge>
                          <span className="flex items-center gap-1 text-xs font-medium text-accent-600 opacity-0 transition-opacity group-hover:opacity-100">
                            {isFilled ? 'Filled' : 'Fill'}
                            <ArrowRight className="h-3 w-3" />
                          </span>
                        </div>

                        <p className="text-xs text-ink-500 dark:text-ink-400">{ROLE_DESCRIPTION[staff.role]}</p>

                        <ul className="flex flex-wrap gap-x-3 gap-y-1">
                          {HIGHLIGHTS.map((h) => {
                            const allowed = granted.includes(h.permission)
                            return (
                              <li
                                key={h.permission}
                                className={cn(
                                  'flex items-center gap-1 text-[11px]',
                                  allowed ? 'text-ink-600 dark:text-ink-300' : 'text-ink-300 line-through dark:text-ink-600',
                                )}
                              >
                                <span className={cn('font-bold', allowed ? 'text-success-600' : 'text-ink-300 dark:text-ink-600')}>
                                  {allowed ? '✓' : '—'}
                                </span>
                                {h.label}
                              </li>
                            )
                          })}
                        </ul>
                      </button>
                    </Card>
                  )
                })}
              </div>
            )}

            {/* Client Portal Cards */}
            {personaTab === 'client' && (
              <div className="flex flex-col gap-3">
                {demoClients.map((client) => {
                  const isFilled = filledId === client.id
                  return (
                    <Card
                      key={client.id}
                      className={cn(
                        'overflow-hidden p-0 transition-all hover:border-accent-400',
                        isFilled && 'border-accent-500 ring-2 ring-accent-500/20',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => fillFromClient(client)}
                        className="group flex w-full flex-col gap-2.5 p-4 text-left transition-colors hover:bg-accent-50/60 dark:hover:bg-accent-900/15"
                      >
                        <div className="flex w-full items-center gap-3">
                          <Avatar name={client.name} color={client.avatarColor} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-ink-900 dark:text-ink-50">{client.name}</p>
                            <p className="truncate text-xs text-accent-600 dark:text-accent-400 font-medium">
                              {client.businessName || 'Independent Business'}
                            </p>
                            <p className="truncate text-[11px] text-ink-400">{client.email}</p>
                          </div>
                          {client.trn && (
                            <Badge tone="accent" size="sm">
                              TRN: {client.trn.slice(0, 7)}...
                            </Badge>
                          )}
                          <span className="flex items-center gap-1 text-xs font-medium text-accent-600 opacity-0 transition-opacity group-hover:opacity-100">
                            {isFilled ? 'Filled' : 'Fill'}
                            <ArrowRight className="h-3 w-3" />
                          </span>
                        </div>

                        <div className="rounded-lg bg-ink-50 p-2.5 dark:bg-ink-800/40">
                          <p className="text-xs text-ink-600 dark:text-ink-300">
                            🏢 <span className="font-semibold text-ink-800 dark:text-ink-100">{client.businessName}</span> — Portal client access for tax filings, invoice copies &amp; document tracking.
                          </p>
                        </div>

                        <ul className="flex flex-wrap gap-x-3 gap-y-1">
                          {[
                            { label: 'View VAT & CT Filings', allowed: true },
                            { label: 'View Invoices & Receipts', allowed: true },
                            { label: 'Document Expiry Alerts', allowed: true },
                            { label: 'Firm Accounting Ledger', allowed: false },
                          ].map((item) => (
                            <li
                              key={item.label}
                              className={cn(
                                'flex items-center gap-1 text-[11px]',
                                item.allowed ? 'text-ink-600 dark:text-ink-300' : 'text-ink-300 line-through dark:text-ink-600',
                              )}
                            >
                              <span className={cn('font-bold', item.allowed ? 'text-success-600' : 'text-ink-300 dark:text-ink-600')}>
                                {item.allowed ? '✓' : '—'}
                              </span>
                              {item.label}
                            </li>
                          ))}
                        </ul>
                      </button>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
