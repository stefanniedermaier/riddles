import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createPuzzlePool } from '../pool'
import { load, save } from '../storage'

describe('puzzle pool', () => {
  beforeEach(() => localStorage.clear())

  it('serves a cached puzzle, refills it and persists the pool', async () => {
    save('test:pool', { easy: 'cached-easy' })
    const generate = vi.fn((difficulty: string, seed: number) => Promise.resolve(`${difficulty}-${seed}`))
    const pool = createPuzzlePool<'easy' | 'hard', string>({ key: 'test:pool', generate })

    await expect(pool.take('easy')).resolves.toBe('cached-easy')
    await vi.waitFor(() => expect(load<Record<string, string>>('test:pool', {}).easy).toMatch(/^easy-/))
    expect(generate).toHaveBeenCalledTimes(1)
  })

  it('ignores invalid and dangerous stored keys', async () => {
    localStorage.setItem('riddles:test:pool', '{"__proto__":{"polluted":true},"easy":42}')
    const generate = vi.fn(() => Promise.resolve('fresh'))
    const pool = createPuzzlePool<'easy', string>({
      key: 'test:pool',
      generate,
      isValid: (p): p is string => typeof p === 'string',
    })
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
    await expect(pool.take('easy')).resolves.toBe('fresh')
  })
})
