import { useMemo, useState } from 'react'
import {
  CalendarCheck2,
  CheckCircle2,
  FileCheck,
  FileSpreadsheet,
  FileText,
  History,
  Lock,
  LockOpen,
  Mail,
  MessageCircle,
  Receipt,
  Scale,
} from 'lucide-react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Select } from '../ui/Field'
import { EmptyState } from '../ui/EmptyState'
import { useData } from '../../data/store'
import { formatAED, formatDate } from '../../lib/utils'
import { invoiceTotal } from '../../lib/invoice'

interface ClientTimelineTabProps {
  clientId: string
  clientName: string
}

type EventCategory = 'all' | 'compliance' | 'billing' | 'matters' | 'reminders'

interface TimelineItem {
  id: string
  timestamp: string
  dateLabel: string
  title: string
  subtitle?: string
  actor?: string
  category: EventCategory
  icon: React.ReactNode
  badgeTone: 'accent' | 'success' | 'warning' | 'danger' | 'neutral'
  badgeText: string
  extra?: React.ReactNode
}

export function ClientTimelineTab({ clientId }: ClientTimelineTabProps) {
  const {
    auditLog,
    filingPeriods,
    obligationTypes,
    matters,
    invoices,
    creditNotes,
    reminderLog,
    clientDocuments,
    documentTypes,
  } = useData()

  const [category, setCategory] = useState<EventCategory>('all')

  const items = useMemo(() => {
    const list: TimelineItem[] = []

    // 1. Audit Log Entries
    auditLog
      .filter((a) => a.clientId === clientId)
      .forEach((a) => {
        let icon = <History className="h-4 w-4" />
        let badgeTone: TimelineItem['badgeTone'] = 'accent'
        let badgeText = 'Audit'

        if (a.action === 'year-closed') {
          icon = <Lock className="h-4 w-4 text-warning-600" />
          badgeTone = 'warning'
          badgeText = 'Tax Year Closed'
        } else if (a.action === 'year-reopened') {
          icon = <LockOpen className="h-4 w-4 text-danger-600" />
          badgeTone = 'danger'
          badgeText = 'Tax Year Reopened'
        } else if (a.action === 'filing-submitted') {
          icon = <FileCheck className="h-4 w-4 text-success-600" />
          badgeTone = 'success'
          badgeText = 'FTA Submission'
        }

        list.push({
          id: `audit-${a.id}`,
          timestamp: a.at,
          dateLabel: formatDate(a.at.slice(0, 10)),
          title: a.subject,
          subtitle: a.note,
          actor: a.actor,
          category: 'compliance',
          icon,
          badgeTone,
          badgeText,
        })
      })

    // 2. Filed Periods with FTA references
    filingPeriods
      .filter((p) => p.clientId === clientId && p.state === 'filed' && p.filedAt)
      .forEach((p) => {
        const type = obligationTypes.find((t) => t.id === p.obligationTypeId)
        list.push({
          id: `filing-${p.id}`,
          timestamp: `${p.filedAt!}T12:00:00`,
          dateLabel: formatDate(p.filedAt!),
          title: `${type?.name ?? 'Filing'} — ${p.label} Filed`,
          subtitle: p.ftaReferenceNo ? `FTA Ref: ${p.ftaReferenceNo}${p.taxPayableOrRefund !== undefined ? ` · Net Tax: ${formatAED(p.taxPayableOrRefund)}` : ''}` : `Submitted to FTA`,
          actor: p.submittedBy || 'Tax Agent',
          category: 'compliance',
          icon: <CalendarCheck2 className="h-4 w-4 text-success-600" />,
          badgeTone: 'success',
          badgeText: 'Filing Complete',
        })
      })

    // 3. Matters
    matters
      .filter((m) => m.clientId === clientId)
      .forEach((m) => {
        list.push({
          id: `matter-open-${m.id}`,
          timestamp: `${m.openedAt}T09:00:00`,
          dateLabel: formatDate(m.openedAt),
          title: `Matter Opened: ${m.title}`,
          subtitle: m.notes || (m.clientInitiated ? 'Requested by client' : 'Firm-initiated compliance task'),
          actor: 'Legal Team',
          category: 'matters',
          icon: <Scale className="h-4 w-4 text-accent-600" />,
          badgeTone: 'accent',
          badgeText: `Matter ${m.status}`,
        })

        if (m.completedAt) {
          list.push({
            id: `matter-done-${m.id}`,
            timestamp: `${m.completedAt}T17:00:00`,
            dateLabel: formatDate(m.completedAt),
            title: `Matter Completed: ${m.title}`,
            subtitle: 'Ready for billing and reconciliation',
            actor: 'Assigned Lawyer',
            category: 'matters',
            icon: <CheckCircle2 className="h-4 w-4 text-success-600" />,
            badgeTone: 'success',
            badgeText: 'Matter Completed',
          })
        }
      })

    // 4. Invoices & Credit Notes
    invoices
      .filter((i) => i.clientId === clientId)
      .forEach((i) => {
        list.push({
          id: `inv-${i.id}`,
          timestamp: `${i.issueDate}T10:00:00`,
          dateLabel: formatDate(i.issueDate),
          title: `Invoice Issued: #${i.number} (${formatAED(invoiceTotal(i))})`,
          subtitle: `Status: ${i.status} · Due: ${formatDate(i.dueDate)}`,
          actor: 'Billing Specialist',
          category: 'billing',
          icon: <FileSpreadsheet className="h-4 w-4 text-ink-600" />,
          badgeTone: i.status === 'paid' ? 'success' : 'warning',
          badgeText: `Invoice ${i.status}`,
        })
      })

    creditNotes
      .filter((c) => c.clientId === clientId)
      .forEach((c) => {
        list.push({
          id: `cn-${c.id}`,
          timestamp: `${c.issueDate}T11:00:00`,
          dateLabel: formatDate(c.issueDate),
          title: `Tax Credit Note #${c.number}: ${formatAED(c.amount + c.vatAmount)}`,
          subtitle: `Reason: ${c.reason}`,
          actor: 'Accounts Partner',
          category: 'billing',
          icon: <Receipt className="h-4 w-4 text-danger-600" />,
          badgeTone: 'danger',
          badgeText: 'Credit Note',
        })
      })

    // 5. Reminders Log
    reminderLog
      .filter((r) => r.clientId === clientId)
      .forEach((r) => {
        list.push({
          id: `rem-${r.id}`,
          timestamp: r.sentAt,
          dateLabel: formatDate(r.sentAt.slice(0, 10)),
          title: `Reminder Sent: ${r.subject}`,
          subtitle: `Channel: ${r.channel.toUpperCase()} · Status: ${r.status}`,
          actor: 'Notification Engine',
          category: 'reminders',
          icon: r.channel === 'whatsapp' ? <MessageCircle className="h-4 w-4 text-emerald-600" /> : <Mail className="h-4 w-4 text-sky-600" />,
          badgeTone: r.status === 'delivered' ? 'success' : 'neutral',
          badgeText: `${r.channel} ${r.status}`,
        })
      })

    // 6. Client Documents
    clientDocuments
      .filter((d) => d.clientId === clientId)
      .forEach((d) => {
        const type = documentTypes.find((t) => t.id === d.typeId)
        list.push({
          id: `doc-${d.id}`,
          timestamp: `${d.issueDate}T08:00:00`,
          dateLabel: formatDate(d.issueDate),
          title: `Document Registered: ${type?.name ?? 'Document'}`,
          subtitle: d.number ? `Doc No: ${d.number} · Expires: ${formatDate(d.expiryDate)}` : `Expires: ${formatDate(d.expiryDate)}`,
          actor: 'Intake Staff',
          category: 'compliance',
          icon: <FileText className="h-4 w-4 text-ink-600" />,
          badgeTone: 'neutral',
          badgeText: d.status,
        })
      })

    // Sort descending by timestamp
    return list.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  }, [clientId, auditLog, filingPeriods, obligationTypes, matters, invoices, creditNotes, reminderLog, clientDocuments, documentTypes])

  const filtered = useMemo(() => {
    if (category === 'all') return items
    return items.filter((i) => i.category === category)
  }, [items, category])

  return (
    <div className="flex flex-col gap-5">
      {/* Filter and stats */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-ink-800 dark:text-ink-100">Audit Trail &amp; Practice Timeline</h2>
            <p className="text-xs text-ink-500 dark:text-ink-400">
              Immutable chronological record of submissions, tax year actions, matters, and client communications.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-ink-500">Filter Event:</span>
            <Select
              className="w-48 text-xs"
              value={category}
              onChange={(e) => setCategory(e.target.value as EventCategory)}
            >
              <option value="all">All Events ({items.length})</option>
              <option value="compliance">Compliance &amp; FTA Filings</option>
              <option value="matters">Matters &amp; Work</option>
              <option value="billing">Invoices &amp; Credit Notes</option>
              <option value="reminders">WhatsApp &amp; Email Alerts</option>
            </Select>
          </div>
        </div>
      </Card>

      {/* Vertical Timeline */}
      {filtered.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={<History className="h-6 w-6" />}
            title="No activity recorded"
            description="Timeline events will appear here as filings, matters, and documents are processed."
          />
        </Card>
      ) : (
        <div className="relative pl-6 before:absolute before:bottom-3 before:left-[17px] before:top-3 before:w-0.5 before:bg-ink-200 dark:before:bg-ink-800">
          <div className="flex flex-col gap-4">
            {filtered.map((item) => (
              <div key={item.id} className="relative flex items-start gap-4">
                {/* Node icon */}
                <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink-200 bg-white shadow-xs dark:border-ink-700 dark:bg-ink-900">
                  {item.icon}
                </div>

                {/* Content Card */}
                <Card className="flex-1 p-3.5 transition-shadow hover:shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-ink-900 dark:text-ink-100">{item.title}</p>
                        <Badge tone={item.badgeTone} size="sm">
                          {item.badgeText}
                        </Badge>
                      </div>
                      {item.subtitle && (
                        <p className="mt-1 text-xs text-ink-600 dark:text-ink-300">{item.subtitle}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-ink-700 dark:text-ink-200">{item.dateLabel}</p>
                      {item.actor && (
                        <p className="mt-0.5 text-[11px] text-ink-400">By {item.actor}</p>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
