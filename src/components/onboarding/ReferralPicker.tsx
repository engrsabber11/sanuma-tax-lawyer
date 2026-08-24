import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight, Search, X } from 'lucide-react'
import { Avatar } from '../ui/Avatar'
import { Badge } from '../ui/Badge'
import { Input, Label } from '../ui/Field'
import { useData } from '../../data/store'

/**
 * Referrer (Level 1) + Sub-Referrer (Level 2) picker.
 *
 * Lifted out of ClientOnboarding when the tax-year work and the referral work
 * met in the same file. The markup and behaviour are Muhammad Hannan's from
 * origin/master, unchanged — only the state it reads was turned into props so
 * the obligation-based wizard can host it on step 1 instead of it owning a
 * whole step of its own.
 */
export function ReferralPicker({
  clientName,
  referrerId,
  subReferrerId,
  onChange,
}: {
  clientName: string
  referrerId: string | null
  subReferrerId: string | null
  onChange: (patch: { referrerId?: string | null; subReferrerId?: string | null }) => void
}) {
  const { clients, referralBonusRules } = useData()
  const [referrerQuery, setReferrerQuery] = useState('')
  const [showReferrerSearch, setShowReferrerSearch] = useState(false)
  const [subReferrerQuery, setSubReferrerQuery] = useState('')
  const [showSubReferrerSearch, setShowSubReferrerSearch] = useState(false)

  const referrer = clients.find((c) => c.id === referrerId) ?? null
  const subReferrer = clients.find((c) => c.id === subReferrerId) ?? null

  // Downline of the primary referrer for quick one-click sub-referral assignment
  const referrerDownline = useMemo(() => {
    if (!referrerId) return []
    return clients.filter((c) => c.referredById === referrerId)
  }, [referrerId, clients])

  // Full multi-level referral chain
  const chain = useMemo(() => {
    const nodes: { id: string; name: string; levelLabel: string; role: 'referrer' | 'sub-referrer' | 'upline' }[] = []

    if (referrer) {
      let cur = clients.find((c) => c.id === referrer.referredById)
      const uplines: typeof nodes = []
      while (cur) {
        uplines.unshift({ id: cur.id, name: cur.name, levelLabel: 'Upline', role: 'upline' })
        cur = clients.find((c) => c.id === cur?.referredById)
      }
      nodes.push(...uplines)
      nodes.push({ id: referrer.id, name: referrer.name, levelLabel: 'Level 1 (Direct)', role: 'referrer' })
    }

    if (subReferrer && subReferrer.id !== referrer?.id) {
      nodes.push({ id: subReferrer.id, name: subReferrer.name, levelLabel: 'Level 2 (Sub-Ref)', role: 'sub-referrer' })
    }

    return nodes
  }, [referrer, subReferrer, clients])

  const referrerResults = referrerQuery
    ? clients
        .filter((c) => c.id !== subReferrerId && (c.name + (c.businessName ?? '')).toLowerCase().includes(referrerQuery.toLowerCase()))
        .slice(0, 5)
    : clients.filter((c) => c.id !== subReferrerId).slice(0, 5)

  const subReferrerResults = subReferrerQuery
    ? clients
        .filter((c) => c.id !== referrerId && (c.name + (c.businessName ?? '')).toLowerCase().includes(subReferrerQuery.toLowerCase()))
        .slice(0, 5)
    : clients.filter((c) => c.id !== referrerId).slice(0, 5)

  const l1Rule = referralBonusRules.find((r) => r.level === 1)
  const l2Rule = referralBonusRules.find((r) => r.level === 2)

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm font-medium text-ink-800 dark:text-ink-200">Referral &amp; Multi-Level Network</p>
        <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">
          Link this client to a Direct Referrer (Level 1) and an optional Sub-Referrer (Level 2). Skip if direct.
        </p>
      </div>

      {/* Level 1: Primary Referrer */}
      <div className="flex flex-col gap-2 rounded-xl border border-ink-200/70 p-4 dark:border-ink-800 bg-ink-50/40 dark:bg-ink-900/40">
        <div className="flex items-center justify-between">
          <Label className="mb-0 flex items-center gap-2">
            <span>Primary Referrer</span>
            <Badge tone="accent" size="sm">Level 1 (Direct)</Badge>
          </Label>
          {l1Rule?.enabled && (
            <span className="text-[11px] font-medium text-accent-600 dark:text-accent-400">
              Bonus: {l1Rule.type === 'percentage' ? `${l1Rule.value}%` : `AED ${l1Rule.value}`}
            </span>
          )}
        </div>

        {referrer ? (
          <div className="flex items-center gap-3 rounded-lg border border-accent-200 bg-accent-50/80 p-3 dark:border-accent-800/80 dark:bg-accent-900/20">
            <Avatar name={referrer.name} color={referrer.avatarColor} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm text-ink-900 dark:text-ink-100">{referrer.name}</p>
              <p className="text-xs text-ink-500 dark:text-ink-400">{referrer.businessName ?? referrer.phone}</p>
            </div>
            <button
              type="button"
              onClick={() => onChange({ referrerId: null })}
              className="rounded-lg p-1.5 text-ink-400 hover:bg-white/80 hover:text-ink-700 dark:hover:bg-ink-800 dark:hover:text-ink-200"
              title="Remove Primary Referrer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <Input
              placeholder="Search existing client by name or business…"
              className="pl-9 bg-white dark:bg-ink-900"
              value={referrerQuery}
              onFocus={() => setShowReferrerSearch(true)}
              onChange={(e) => {
                setReferrerQuery(e.target.value)
                setShowReferrerSearch(true)
              }}
            />
            {showReferrerSearch && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowReferrerSearch(false)} />
                <div className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-xl border border-ink-200/80 bg-white shadow-[var(--shadow-popover)] dark:border-ink-800 dark:bg-ink-900">
                  {referrerResults.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        onChange({ referrerId: c.id })
                        setShowReferrerSearch(false)
                        setReferrerQuery('')
                      }}
                      className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm hover:bg-ink-100 dark:hover:bg-ink-800"
                    >
                      <Avatar name={c.name} color={c.avatarColor} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-ink-800 dark:text-ink-100">{c.name}</p>
                        <p className="truncate text-xs text-ink-400">{c.businessName ?? c.phone}</p>
                      </div>
                    </button>
                  ))}
                  {referrerResults.length === 0 && <p className="px-3.5 py-3 text-sm text-ink-400">No matching clients</p>}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Level 2: Sub-Referrer */}
      <div className="flex flex-col gap-2 rounded-xl border border-ink-200/70 p-4 dark:border-ink-800 bg-ink-50/40 dark:bg-ink-900/40">
        <div className="flex items-center justify-between">
          <Label className="mb-0 flex items-center gap-2">
            <span>Sub-Referrer</span>
            <Badge tone="neutral" size="sm">Level 2 (Sub-referred by)</Badge>
          </Label>
          {l2Rule?.enabled && (
            <span className="text-[11px] font-medium text-ink-500 dark:text-ink-400">
              Bonus: {l2Rule.type === 'percentage' ? `${l2Rule.value}%` : `AED ${l2Rule.value}`}
            </span>
          )}
        </div>

        {/* Quick chips if primary referrer has clients in their network */}
        {referrer && referrerDownline.length > 0 && !subReferrer && (
          <div className="mb-1">
            <p className="text-[11px] font-medium text-ink-400 mb-1.5">
              Suggested from {referrer.name}&apos;s network:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {referrerDownline.slice(0, 4).map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => onChange({ subReferrerId: d.id })}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200/80 bg-white px-2.5 py-1 text-xs text-ink-700 hover:border-accent-300 hover:bg-accent-50/50 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200"
                >
                  <Avatar name={d.name} color={d.avatarColor} size="xs" />
                  <span className="truncate max-w-32">{d.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {subReferrer ? (
          <div className="flex items-center gap-3 rounded-lg border border-ink-300 bg-white p-3 dark:border-ink-700 dark:bg-ink-800/80">
            <Avatar name={subReferrer.name} color={subReferrer.avatarColor} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm text-ink-900 dark:text-ink-100">{subReferrer.name}</p>
              <p className="text-xs text-ink-500 dark:text-ink-400">{subReferrer.businessName ?? subReferrer.phone}</p>
            </div>
            <button
              type="button"
              onClick={() => onChange({ subReferrerId: null })}
              className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-700 dark:hover:text-ink-200"
              title="Remove Sub-Referrer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <Input
              placeholder="Search or pick sub-referrer (optional)…"
              className="pl-9 bg-white dark:bg-ink-900"
              value={subReferrerQuery}
              onFocus={() => setShowSubReferrerSearch(true)}
              onChange={(e) => {
                setSubReferrerQuery(e.target.value)
                setShowSubReferrerSearch(true)
              }}
            />
            {showSubReferrerSearch && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowSubReferrerSearch(false)} />
                <div className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-xl border border-ink-200/80 bg-white shadow-[var(--shadow-popover)] dark:border-ink-800 dark:bg-ink-900">
                  {subReferrerResults.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        onChange({ subReferrerId: c.id })
                        setShowSubReferrerSearch(false)
                        setSubReferrerQuery('')
                      }}
                      className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm hover:bg-ink-100 dark:hover:bg-ink-800"
                    >
                      <Avatar name={c.name} color={c.avatarColor} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-ink-800 dark:text-ink-100">{c.name}</p>
                        <p className="truncate text-xs text-ink-400">{c.businessName ?? c.phone}</p>
                      </div>
                    </button>
                  ))}
                  {subReferrerResults.length === 0 && <p className="px-3.5 py-3 text-sm text-ink-400">No matching clients</p>}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Multi-Level Referral Hierarchy Chain Preview */}
      {(referrer || subReferrer) && chain.length > 0 && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="rounded-xl bg-ink-100/70 p-4 dark:bg-ink-800/60 border border-ink-200/60 dark:border-ink-700/60">
          <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400">
            Multi-Level Referral Hierarchy
          </p>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {chain.map((item) => (
              <span key={item.id} className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-ink-800 shadow-sm dark:bg-ink-900 dark:text-ink-100 border border-ink-200 dark:border-ink-700">
                  <span>{item.name}</span>
                  <span className="text-[10px] text-ink-400">({item.levelLabel})</span>
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-ink-400" />
              </span>
            ))}
            <Badge tone="success">{clientName || 'New Client'}</Badge>
          </div>

          <div className="mt-3.5 pt-3 border-t border-ink-200/60 dark:border-ink-700/60 flex flex-wrap gap-4 text-xs text-ink-500 dark:text-ink-400">
            {referrer && l1Rule?.enabled && (
              <span>
                • <strong className="text-ink-700 dark:text-ink-200">{referrer.name}</strong> will receive Level 1 bonus ({l1Rule.type === 'percentage' ? `${l1Rule.value}%` : `AED ${l1Rule.value}`})
              </span>
            )}
            {subReferrer && l2Rule?.enabled && (
              <span>
                • <strong className="text-ink-700 dark:text-ink-200">{subReferrer.name}</strong> will receive Level 2 bonus ({l2Rule.type === 'percentage' ? `${l2Rule.value}%` : `AED ${l2Rule.value}`})
              </span>
            )}
          </div>
        </motion.div>
      )}
    </div>
  )
}
