import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Building, Eye, EyeOff, Info, Lock, Mail } from 'lucide-react'
import { Avatar } from '../components/ui/Avatar'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ErrorText, Input, Label, invalidFieldClass } from '../components/ui/Field'
import { useData } from '../data/store'
import { demoPasswordFor } from '../data/demoCredentials'
import { ROLE_DESCRIPTION, ROLE_LABEL, ROLE_PERMISSIONS, type Permission } from '../data/permissions'
import { cn, sleep } from '../lib/utils'
import type { StaffRole, StaffUser } from '../data/types'

/**
 * Sign-in.
 *
 * A real form — email, password, and a refusal when either is wrong — with the
 * three demo users beside it as one-click fill. The form is not decoration: the
 * rest of the app will be built against "sign-in can fail", and a picker that
 * always succeeds would hide that.
 *
 * The passwords are in the bundle, so this is not a security boundary. The screen
 * says so rather than implying otherwise.
 */

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
  const { staffMembers, firmProfile, signInWithCredentials } = useData()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [reveal, setReveal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  /** Which card was used to fill the form, so the choice stays visible. */
  const [filledId, setFilledId] = useState<string | null>(null)

  function fillFrom(staff: StaffUser) {
    setEmail(staff.email)
    setPassword(demoPasswordFor(staff.id))
    setFilledId(staff.id)
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
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Sign in to the practice workspace</p>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,380px)_1fr]">
          {/* ---------------------------------------------------- the form */}
          <Card className="p-6">
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
                  <span className="font-medium text-ink-700 dark:text-ink-200">Demo credentials.</span> The passwords ship
                  in the bundle, so this is not real authentication — it is the form the app will keep once there is a
                  server behind it. Pick a user on the right to fill it in.
                </p>
              </div>
            </form>
          </Card>

          {/* ------------------------------------------ click-to-fill users */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">
              Sign in as — click to fill the form
            </p>
            {staffMembers.map((staff) => {
              const granted = ROLE_PERMISSIONS[staff.role]
              const isFilled = filledId === staff.id
              return (
                <Card key={staff.id} className={cn('overflow-hidden p-0 transition-shadow', isFilled && 'ring-2 ring-accent-500')}>
                  <button
                    type="button"
                    onClick={() => fillFrom(staff)}
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

                    {/* Same five capabilities on every card, ticked or struck, so the
                        difference between roles is visible before you commit to one. */}
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
        </div>
      </div>
    </div>
  )
}
