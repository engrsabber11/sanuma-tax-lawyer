import type { BusinessType } from './types'

/**
 * Documents worth requesting for each business type.
 *
 * This used to gate onboarding as a mandatory step. From Phase 3 it is only a
 * suggestion on the success screen: a client whose entire need is a VAT return
 * should not be blocked on picking a business type. Left as data because it is
 * data — the onboarding page merely reads it.
 */
export const SUGGESTED_DOCUMENTS: Record<BusinessType, string[]> = {
  grocery: ['dt-trade-license', 'dt-municipality-permit', 'dt-civil-defense', 'dt-ejari', 'dt-eid', 'dt-visa'],
  trading: ['dt-trade-license', 'dt-chamber', 'dt-customs', 'dt-eid'],
  'f&b': ['dt-trade-license', 'dt-municipality-permit', 'dt-civil-defense', 'dt-ejari', 'dt-eid', 'dt-visa'],
  services: ['dt-trade-license', 'dt-eid', 'dt-visa'],
  other: ['dt-eid', 'dt-passport', 'dt-visa'],
}

export const BUSINESS_TYPE_LABEL: Record<BusinessType, string> = {
  grocery: 'Grocery / Supermarket',
  trading: 'Trading Company',
  'f&b': 'Food & Beverage',
  services: 'Professional Services',
  other: 'Individual / Other',
}
