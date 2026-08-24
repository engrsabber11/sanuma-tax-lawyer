/**
 * Money rounding.
 *
 * Every journal line is rounded before it is posted. 5% VAT on an odd amount
 * produces fractions of a fil, and a journal that misses balance by 0.004 is
 * still a journal `postJournal` will refuse — so the rounding has to happen at
 * composition time, not at render time.
 */

/** Two decimal places, the fil. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

/**
 * Splits `total` across `parts` so the rounded pieces sum to exactly the rounded
 * total. The last part absorbs the residual.
 *
 * Used where a single VAT figure has to be apportioned across several revenue
 * accounts: rounding each share independently can leave the entry out by a fil.
 */
export function allocate(total: number, weights: number[]): number[] {
  const sum = weights.reduce((s, w) => s + w, 0)
  if (sum === 0) return weights.map(() => 0)
  const target = round2(total)
  const out = weights.map((w) => round2((target * w) / sum))
  const drift = round2(target - out.reduce((s, v) => s + v, 0))
  if (drift !== 0 && out.length > 0) out[out.length - 1] = round2(out[out.length - 1] + drift)
  return out
}
