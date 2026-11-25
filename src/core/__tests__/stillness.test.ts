import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import { pushDialog } from '../dialogs'
import { IDLE_MS, installStillness } from '../stillness'

describe('stillness', () => {
  afterEach(() => vi.useRealTimers())

  it('marks the page still while a dialog is open or nobody plays', async () => {
    vi.useFakeTimers()
    installStillness()
    const still = () => document.documentElement.hasAttribute('data-still')
    await nextTick()
    expect(still()).toBe(false)

    const release = pushDialog({ panel: () => null, onEscape: () => {} })
    await nextTick()
    expect(still()).toBe(true)
    release()
    await nextTick()
    expect(still()).toBe(false)

    vi.advanceTimersByTime(IDLE_MS)
    await nextTick()
    expect(still()).toBe(true)
    document.dispatchEvent(new Event('pointerdown'))
    await nextTick()
    expect(still()).toBe(false)
  })
})
