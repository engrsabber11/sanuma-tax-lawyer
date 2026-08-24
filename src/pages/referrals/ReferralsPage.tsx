import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Trophy, Percent, Coins } from 'lucide-react'
import { Card, CardBody, CardHeader, CardTitle } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Avatar } from '../../components/ui/Avatar'
import { Tabs } from '../../components/ui/Tabs'
import { Switch } from '../../components/ui/Switch'
import { Input } from '../../components/ui/Field'
import { Pagination } from '../../components/ui/Pagination'
import { useData } from '../../data/store'
import { formatAED, cn } from '../../lib/utils'
import type { ReferralBonusRule } from '../../data/types'

export function ReferralsPage() {
  const { clients, referralBonusRules: rules, walletTransactions, updateReferralBonusRule } = useData()
  const [tab, setTab] = useState('rules')
  const [walletPage, setWalletPage] = useState(1)
  const [walletPageSize, setWalletPageSize] = useState(10)

  const wallets = useMemo(
    () =>
      clients
        .map((c) => {
          const tx = walletTransactions.filter((w) => w.clientId === c.id)
          const balance = tx.reduce((s, t) => s + (t.type === 'credit' ? t.amount : -t.amount), 0)
          const directCount = clients.filter((r) => r.referredById === c.id).length
          const subCount = clients.filter((r) => r.subReferredById === c.id || (r.referredById && clients.find((x) => x.id === r.referredById)?.referredById === c.id)).length
          const referralCount = directCount + subCount
          const earned = tx.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0)
          return { client: c, balance, referralCount, directCount, subCount, earned }
        })
        .filter((w) => w.balance !== 0 || w.referralCount > 0),
    [clients, walletTransactions],
  )

  const leaderboard = [...wallets].sort((a, b) => b.referralCount - a.referralCount || b.earned - a.earned)

  function updateRule(level: number, patch: Partial<ReferralBonusRule>) {
    updateReferralBonusRule(level, patch)
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900 dark:text-ink-50">Referrals &amp; Wallet</h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Configure multi-level referral bonuses and track every client's wallet.</p>
      </div>

      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'rules', label: 'Bonus Rules' },
          { id: 'wallets', label: 'Client Wallets', count: wallets.length },
          { id: 'leaderboard', label: 'Leaderboard' },
        ]}
      />

      {tab === 'rules' && (
        <Card>
          <CardHeader>
            <CardTitle>Referral bonus by level</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col gap-3 pt-3">
            {rules.map((r) => (
              <div key={r.level} className="flex flex-wrap items-center gap-3 rounded-xl border border-ink-200/70 p-4 dark:border-ink-800">
                <Switch checked={r.enabled} onChange={() => updateRule(r.level, { enabled: !r.enabled })} />
                <div className="min-w-40 flex-1">
                  <p className="text-sm font-medium text-ink-800 dark:text-ink-100">
                    Level {r.level} <span className="font-normal text-ink-400">— {r.label}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateRule(r.level, { type: 'flat' })}
                    className={cn('rounded-md px-2.5 py-1.5 text-xs font-medium', r.type === 'flat' ? 'bg-accent-100 text-accent-700 dark:bg-accent-900/40 dark:text-accent-300' : 'text-ink-400')}
                  >
                    <Coins className="mr-1 inline h-3 w-3" /> Flat AED
                  </button>
                  <button
                    onClick={() => updateRule(r.level, { type: 'percentage' })}
                    className={cn('rounded-md px-2.5 py-1.5 text-xs font-medium', r.type === 'percentage' ? 'bg-accent-100 text-accent-700 dark:bg-accent-900/40 dark:text-accent-300' : 'text-ink-400')}
                  >
                    <Percent className="mr-1 inline h-3 w-3" /> Percentage
                  </button>
                </div>
                <div className="w-28">
                  <Input
                    type="number"
                    value={r.value}
                    onChange={(e) => updateRule(r.level, { value: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            ))}
            <p className="mt-1 text-xs text-ink-400">
              Bonuses are credited to the referrer's wallet automatically once the referred client's invoice is paid — never on signup alone.
            </p>
          </CardBody>
        </Card>
      )}

      {tab === 'wallets' && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-400 dark:border-ink-800">
                  <th className="px-5 py-3 font-medium">Client</th>
                  <th className="px-5 py-3 font-medium">Referrals made</th>
                  <th className="px-5 py-3 font-medium">Total earned</th>
                  <th className="px-5 py-3 font-medium">Wallet balance</th>
                </tr>
              </thead>
              <tbody>
                {wallets.slice((walletPage - 1) * walletPageSize, walletPage * walletPageSize).map(({ client, balance, referralCount, directCount, subCount, earned }) => (
                  <tr key={client.id} className="border-b border-ink-50 last:border-0 dark:border-ink-800/60">
                    <td className="px-5 py-3.5">
                      <Link to={`/clients/${client.id}?tab=wallet`} className="flex items-center gap-2.5 hover:text-accent-600">
                        <Avatar name={client.name} color={client.avatarColor} size="sm" />
                        <span className="font-medium text-ink-800 dark:text-ink-100">{client.name}</span>
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-ink-500 dark:text-ink-400">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-ink-800 dark:text-ink-200">{referralCount}</span>
                        {subCount > 0 && (
                          <span className="text-xs text-ink-400">
                            ({directCount} direct · {subCount} sub)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-ink-500 dark:text-ink-400">{formatAED(earned)}</td>
                    <td className="px-5 py-3.5 font-medium text-ink-800 dark:text-ink-100">{formatAED(balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={walletPage}
            pageSize={walletPageSize}
            totalItems={wallets.length}
            onPageChange={setWalletPage}
            onPageSizeChange={setWalletPageSize}
            itemLabel="wallets"
          />
        </Card>
      )}

      {tab === 'leaderboard' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-warning-500" /> Top Referrers
            </CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col gap-1 pt-2">
            {leaderboard.map((w, i) => (
              <Link key={w.client.id} to={`/clients/${w.client.id}`} className="flex items-center gap-3 rounded-lg px-2 py-3 hover:bg-ink-50 dark:hover:bg-ink-800">
                <span className={cn('flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold', i === 0 ? 'bg-warning-100 text-warning-700 dark:bg-warning-500/20' : 'bg-ink-100 text-ink-500 dark:bg-ink-800')}>
                  {i + 1}
                </span>
                <Avatar name={w.client.name} color={w.client.avatarColor} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink-800 dark:text-ink-100">{w.client.name}</p>
                  <p className="text-xs text-ink-400">{w.client.businessName}</p>
                </div>
                <Badge tone="accent">
                  {w.referralCount} referral{w.referralCount !== 1 ? 's' : ''}
                  {w.subCount > 0 ? ` (${w.directCount} direct · ${w.subCount} sub)` : ''}
                </Badge>
                <span className="w-24 text-right font-medium text-ink-700 dark:text-ink-200">{formatAED(w.earned)}</span>
              </Link>
            ))}
          </CardBody>
        </Card>
      )}
    </div>
  )
}
