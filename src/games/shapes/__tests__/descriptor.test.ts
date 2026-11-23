import { afterEach, describe, expect, it } from 'vitest'

import { descriptor, saveKey } from '../index'

describe('shapes descriptor', () => {
  afterEach(() => localStorage.clear())

  it('never reports a running Zen game as a game to continue', () => {
    localStorage.setItem(`riddles:${saveKey('zen')}`, '{}')
    expect(descriptor.hasSavedGame()).toBe(false)
  })

  it('reports running Time and Levels games', () => {
    localStorage.setItem(`riddles:${saveKey('time')}`, '{}')
    expect(descriptor.hasSavedGame()).toBe(true)
    localStorage.clear()
    localStorage.setItem(`riddles:${saveKey('levels')}`, '{}')
    expect(descriptor.hasSavedGame()).toBe(true)
  })
})
