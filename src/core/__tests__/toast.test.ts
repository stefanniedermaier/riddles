import { afterEach, describe, expect, it, vi } from 'vitest'

import { showToast, toasts } from '../toast'

describe('toast', () => {
  afterEach(() => {
    vi.useRealTimers()
    toasts.splice(0)
  })

  it('shows only the newest message and hides it after the duration', () => {
    vi.useFakeTimers()
    showToast('one')
    showToast('two')
    expect(toasts.map((toast) => toast.text)).toEqual(['two'])
    vi.advanceTimersByTime(3000)
    expect(toasts).toHaveLength(0)
  })
})
