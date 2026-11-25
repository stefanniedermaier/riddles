/**
 * Seeded pseudo random number generator (mulberry32).
 *
 * All puzzle generators take an `Rng` so that a seed always produces the same puzzle.
 * The internal state is a single 32-bit integer: `createRng(rng.getState())` continues
 * the exact same sequence, which is used to resume games.
 */
export interface Rng {
  /** Float in [0, 1). */
  next(): number
  /** Integer in [0, maxExclusive). */
  int(maxExclusive: number): number
  /** Integer in [min, maxInclusive]. */
  range(min: number, maxInclusive: number): number
  /** `true` with probability `p`. */
  chance(p: number): boolean
  /** Random element of a non-empty array. */
  pick<T>(items: readonly T[]): T
  /** Shuffles the array in place (Fisher–Yates) and returns it. */
  shuffle<T>(items: T[]): T[]
  /** Current internal state; pass it to `createRng` to continue the sequence. */
  getState(): number
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  const int = (maxExclusive: number): number => Math.floor(next() * maxExclusive)

  return {
    next,
    int,
    range: (min, maxInclusive) => min + int(maxInclusive - min + 1),
    chance: (p) => next() < p,
    pick: <T>(items: readonly T[]): T => {
      if (items.length === 0) throw new Error('pick() on empty array')
      return items[int(items.length)] as T
    },
    shuffle: <T>(items: T[]): T[] => {
      for (let i = items.length - 1; i > 0; i--) {
        const j = int(i + 1)
        const tmp = items[i] as T
        items[i] = items[j] as T
        items[j] = tmp
      }
      return items
    },
    getState: () => state,
  }
}

/** Random element of a non-empty array, unseeded (decoration such as particles). */
export function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!
}

/** A random 32-bit seed from the platform's cryptographic RNG. */
export function randomSeed(): number {
  const buffer = new Uint32Array(1)
  globalThis.crypto.getRandomValues(buffer)
  return buffer[0] as number
}

/**
 * Derives a well-mixed 32-bit seed from arbitrary parts,
 * e.g. `hashSeed('shapes-level', 12)` or `hashSeed(seed, attempt)`.
 */
export function hashSeed(...parts: (string | number)[]): number {
  // FNV-1a over the joined string …
  let h = 0x811c9dc5
  const text = parts.join('\u0000')
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  // … followed by the murmur3 finaliser for better avalanche.
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  h ^= h >>> 16
  return h >>> 0
}
