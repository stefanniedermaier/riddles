/** Bit helpers for candidate masks. */

const POPCOUNT_16 = new Uint8Array(1 << 16)
for (let i = 1; i < POPCOUNT_16.length; i++) POPCOUNT_16[i] = (i & 1) + POPCOUNT_16[i >> 1]!

/** Number of set bits of a 32-bit integer. */
export function popcount(mask: number): number {
  return POPCOUNT_16[mask & 0xffff]! + POPCOUNT_16[(mask >>> 16) & 0xffff]!
}
