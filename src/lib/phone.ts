/**
 * UAE phone handling. Numbers are stored and displayed in the national format the
 * practice already uses: `+971 50 123 4567` for mobiles, `+971 4 123 4567` for landlines.
 */

/** Mobile operator prefixes in use in the UAE (Etisalat 50/54/56, du 52/55/58). */
export const UAE_MOBILE_PREFIXES = ['50', '52', '54', '55', '56', '58']

/** Landline area codes — 4 is Dubai, 2 Abu Dhabi, 6 Sharjah, and so on. */
const UAE_LANDLINE_CODES = ['2', '3', '4', '6', '7', '9']

export const UAE_MOBILE_PLACEHOLDER = '+971 50 123 4567'

/**
 * Strips everything down to the digits that follow the +971 country code, so a number
 * pasted as 0501234567, 00971501234567 or +971 50 123 4567 all reduce to 501234567.
 */
export function uaeNationalDigits(input: string) {
  let digits = input.replace(/\D/g, '')
  if (digits.startsWith('00971')) digits = digits.slice(5)
  else if (digits.startsWith('971')) digits = digits.slice(3)
  if (digits.startsWith('0')) digits = digits.slice(1)
  return digits.slice(0, 9)
}

export function isUaeMobile(value: string) {
  const d = uaeNationalDigits(value)
  return d.length === 9 && UAE_MOBILE_PREFIXES.includes(d.slice(0, 2))
}

export function isUaeLandline(value: string) {
  const d = uaeNationalDigits(value)
  return d.length === 8 && UAE_LANDLINE_CODES.includes(d[0])
}

export function isUaePhone(value: string) {
  return isUaeMobile(value) || isUaeLandline(value)
}

/**
 * Formats as the user types. Mobiles group as `+971 50 123 4567`, landlines as
 * `+971 4 123 4567`; partial input is grouped the same way so the field reads
 * correctly mid-entry.
 */
export function formatUaePhone(input: string) {
  const d = uaeNationalDigits(input)
  if (!d) return ''

  const isMobile = d[0] === '5'
  const [codeLen, midLen] = isMobile ? [2, 3] : [1, 3]
  const parts = [d.slice(0, codeLen), d.slice(codeLen, codeLen + midLen), d.slice(codeLen + midLen)].filter(Boolean)
  return `+971 ${parts.join(' ')}`
}

/**
 * Formatting a value that only lost a separator would leave it unchanged, which reads as a
 * dead Backspace key. When that happens, drop the last digit instead — what the user meant.
 */
export function applyPhoneEdit(next: string, previous: string) {
  const deleting = next.length < previous.length
  const digits = uaeNationalDigits(next)
  if (deleting && digits === uaeNationalDigits(previous)) return formatUaePhone(digits.slice(0, -1))
  return formatUaePhone(next)
}
