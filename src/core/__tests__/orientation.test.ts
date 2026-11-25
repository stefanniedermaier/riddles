import { afterEach, describe, expect, it, vi } from 'vitest'

import { allowAnyOrientation } from '../orientation'

const original = Object.getOwnPropertyDescriptor(screen, 'orientation')

afterEach(() => {
  if (original) Object.defineProperty(screen, 'orientation', original)
  else delete (screen as { orientation?: unknown }).orientation
})

function fakeOrientation(lock: () => Promise<void>) {
  const api = { lock: vi.fn(lock), unlock: vi.fn() }
  Object.defineProperty(screen, 'orientation', { value: api, configurable: true })
  return api
}

describe('allowAnyOrientation', () => {
  it('lifts the lock and restores it', () => {
    const api = fakeOrientation(() => Promise.resolve())
    const restore = allowAnyOrientation()
    expect(api.lock).toHaveBeenCalledWith('any')
    restore()
    expect(api.unlock).toHaveBeenCalled()
  })

  it('ignores a refused lock and a missing API', async () => {
    fakeOrientation(() => Promise.reject(new Error('not allowed')))
    expect(() => allowAnyOrientation()()).not.toThrow()
    Object.defineProperty(screen, 'orientation', { value: undefined, configurable: true })
    expect(() => allowAnyOrientation()()).not.toThrow()
  })
})
