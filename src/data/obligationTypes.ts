import type { ObligationType } from './types'

/**
 * Built-in obligation catalog.
 *
 * These are defaults, not hardcoded behaviour — Phase 8 makes them editable in
 * Settings, which is how the firm adds its own periodic obligations without a
 * code change.
 *
 * Licence renewals (trade licence, Ejari, visa, Emirates ID) are deliberately
 * NOT here. They are expiry-driven and already handled correctly by
 * `ClientDocument.expiryDate`; giving them generated periods would duplicate
 * the same deadline in two places.
 *
 * Reminder defaults follow the T-60 / T-30 / T-15 / T-7 / D-Day milestones in
 * SanumaBusinessFundamentalBn.md (0 = on the day). Phase 6 consumes them.
 */

const FILING_REMINDER_DAYS = [60, 30, 15, 7, 0]

export const obligationTypes: ObligationType[] = [
  {
    id: 'ob-vat-return',
    name: 'VAT Return',
    shortName: 'VAT',
    periodicity: 'quarterly',
    dueRule: { kind: 'last-day-next-month' },
    staggerOptions: ['jan-apr-jul-oct', 'feb-may-aug-nov', 'mar-jun-sep-dec'],
    serviceId: 'svc-vat-return',
    certificateDocumentTypeId: 'dt-vat-cert',
    defaultReminderDays: FILING_REMINDER_DAYS,
    defaultChannels: ['whatsapp', 'email', 'sms'],
    builtIn: true,
  },
  {
    // A separate catalog entry rather than a flag on the quarterly one: a
    // monthly filer is a different obligation with a different cadence, and
    // splitting them avoids a periodicity special-case in every UI that
    // groups by obligation.
    id: 'ob-vat-return-monthly',
    name: 'VAT Return (Monthly Filer)',
    shortName: 'VAT-M',
    periodicity: 'monthly',
    dueRule: { kind: 'last-day-next-month' },
    serviceId: 'svc-vat-return',
    certificateDocumentTypeId: 'dt-vat-cert',
    defaultReminderDays: [30, 15, 7, 0],
    defaultChannels: ['whatsapp', 'email', 'sms'],
    builtIn: true,
  },
  {
    id: 'ob-ct-return',
    name: 'Corporate Tax Return',
    shortName: 'CT',
    periodicity: 'annual',
    dueRule: { kind: 'months-after-period-end', months: 9 },
    fiscalYearEndMonth: 12,
    serviceId: 'svc-corp-tax-filing',
    certificateDocumentTypeId: 'dt-corp-tax-cert',
    defaultReminderDays: FILING_REMINDER_DAYS,
    defaultChannels: ['whatsapp', 'email', 'sms'],
    builtIn: true,
  },
  {
    id: 'ob-excise-return',
    name: 'Excise Tax Return',
    shortName: 'Excise',
    periodicity: 'monthly',
    dueRule: { kind: 'day-of-next-month', day: 15 },
    serviceId: 'svc-excise-return',
    certificateDocumentTypeId: 'dt-excise',
    defaultReminderDays: [30, 15, 7, 0],
    defaultChannels: ['whatsapp', 'email', 'sms'],
    builtIn: true,
  },
  {
    id: 'ob-esr-notification',
    name: 'ESR Notification',
    shortName: 'ESR-N',
    periodicity: 'annual',
    dueRule: { kind: 'months-after-period-end', months: 6 },
    fiscalYearEndMonth: 12,
    serviceId: 'svc-esr-report',
    defaultReminderDays: [60, 30, 7, 0],
    defaultChannels: ['whatsapp', 'email', 'sms'],
    builtIn: true,
  },
  {
    id: 'ob-esr-report',
    name: 'ESR Report',
    shortName: 'ESR-R',
    periodicity: 'annual',
    dueRule: { kind: 'months-after-period-end', months: 12 },
    fiscalYearEndMonth: 12,
    serviceId: 'svc-esr-report',
    defaultReminderDays: [60, 30, 7, 0],
    defaultChannels: ['whatsapp', 'email', 'sms'],
    builtIn: true,
  },
]

export function obligationTypeById(types: ObligationType[], id: string): ObligationType | undefined {
  return types.find((t) => t.id === id)
}
