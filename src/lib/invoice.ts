import type { Invoice, InvoiceLine } from '../data/types'

export const VAT_RATE = 0.05

function lineAmount(line: InvoiceLine) {
  return line.qty * line.unitPrice
}

export function invoiceSubtotal(lines: InvoiceLine[]) {
  return lines.reduce((sum, l) => sum + lineAmount(l), 0)
}

/** Lines without an explicit flag are VAT-rated — that is how every existing service line behaves. */
export function invoiceVat(lines: InvoiceLine[]) {
  return lines.reduce((sum, l) => (l.vatApplicable === false ? sum : sum + lineAmount(l) * VAT_RATE), 0)
}

export function invoiceTotal(invoiceOrLines: Invoice | InvoiceLine[]) {
  const lines = Array.isArray(invoiceOrLines) ? invoiceOrLines : invoiceOrLines.lines
  return invoiceSubtotal(lines) + invoiceVat(lines)
}

/** What is still owed after payments and applied wallet credits. */
export function invoiceBalanceDue(invoice: Invoice) {
  return invoiceTotal(invoice) - invoice.paidAmount
}
