import { describe, expect, it } from 'vitest'

import { createRng, hashSeed, randomSeed } from '../rng'

describe('rng', () => {
  it('is deterministic per seed', () => {
    const a = createRng(42)
    const b = createRng(42)
    const seqA = Array.from({ length: 20 }, () => a.next())
    const seqB = Array.from({ length: 20 }, () => b.next())
    expect(seqA).toEqual(seqB)
    expect(new Set(seqA).size).toBe(20)
  })

  it('continues the sequence from a saved state', () => {
    const rng = createRng(7)
    rng.next()
    rng.next()
    const resumed = createRng(rng.getState())
    expect(resumed.next()).toBe(rng.next())
    expect(resumed.int(1000)).toBe(rng.int(1000))
  })

  it('produces values in range', () => {
    const rng = createRng(1)
    for (let i = 0; i < 1000; i++) {
      const v = rng.range(3, 5)
      expect(v).toBeGreaterThanOrEqual(3)
      expect(v).toBeLessThanOrEqual(5)
      const f = rng.next()
      expect(f).toBeGreaterThanOrEqual(0)
      expect(f).toBeLessThan(1)
    }
  })

  it('shuffles in place keeping all elements', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8]
    createRng(3).shuffle(items)
    expect([...items].sort()).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })

  it('hashSeed is stable and spreads inputs', () => {
    expect(hashSeed('shapes-level', 1)).toBe(hashSeed('shapes-level', 1))
    expect(hashSeed('shapes-level', 1)).not.toBe(hashSeed('shapes-level', 2))
    expect(hashSeed(1, 23)).not.toBe(hashSeed(12, 3))
  })

  it('randomSeed returns a 32-bit unsigned integer', () => {
    const seed = randomSeed()
    expect(Number.isInteger(seed)).toBe(true)
    expect(seed).toBeGreaterThanOrEqual(0)
    expect(seed).toBeLessThan(2 ** 32)
  })
})
