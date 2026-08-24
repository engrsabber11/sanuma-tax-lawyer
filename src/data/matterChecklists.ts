import { genId } from '../lib/utils'
import type { MatterChecklistItem } from './types'

const TEMPLATES: Record<string, string[]> = {
  'svc-vat-reg': [
    'Confirm turnover exceeds the mandatory VAT threshold',
    'Collect trade license copy',
    'Collect Emirates ID copies of owners/partners',
    'Submit registration on EmaraTax',
    'Receive TRN certificate',
  ],
  'svc-vat-return': [
    'Reconcile sales invoices for the period',
    'Reconcile input VAT on expenses',
    'Prepare VAT return draft',
    'Client review & approval',
    'Submit return on EmaraTax',
    'Confirm payment or refund',
  ],
  'svc-trade-license-renewal': [
    'Collect Ejari / tenancy contract',
    'Collect Civil Defense NOC (if required)',
    'Submit renewal application',
    'Pay renewal fee',
    'Collect renewed license',
  ],
  'svc-corp-tax-reg': [
    'Collect trade license & MOA',
    'Collect Emirates ID / passport of owners',
    'Register on EmaraTax',
    'Receive Corporate Tax TRN',
  ],
  'svc-corp-tax-filing': [
    'Prepare financial statements',
    'Compute taxable income',
    'Prepare Corporate Tax return draft',
    'Client review & approval',
    'Submit return',
    'Confirm payment',
  ],
  'svc-credit-note': ['Identify the original tax invoice', 'Draft the credit note', 'Client review', 'Issue the credit note'],
  'svc-excise-return': [
    'Collect stock movement and production records for the month',
    'Reconcile excise goods released for consumption',
    'Prepare excise return draft',
    'Client review & approval',
    'Submit return on EmaraTax',
    'Confirm payment',
  ],
  'svc-esr-report': [
    'Determine the relevant activity',
    'Prepare ESR notification',
    'File the notification',
    'Prepare ESR report (if required)',
    'File the report',
  ],
  'svc-ubo-update': ['Collect updated UBO details', 'Prepare UBO declaration form', 'Submit to the authority'],
}

export function defaultChecklistForService(serviceId: string): MatterChecklistItem[] {
  const steps = TEMPLATES[serviceId] ?? []
  return steps.map((label) => ({ id: genId('mc'), label, done: false }))
}
