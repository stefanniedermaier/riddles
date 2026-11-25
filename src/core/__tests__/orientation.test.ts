import { afterEach, describe, expect, it, vi } from 'vitest'

import { allowAnyOrientation, preferPortrait } from '../orientation'

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

describe('orientation', () => {
  it('asks for portrait, allows any orientation in a view and goes back to portrait', () => {
    const api = fakeOrientation(() => Promise.resolve())
    preferPortrait()
    expect(api.lock).toHaveBeenLastCalledWith('portrait')
    const restore = allowAnyOrientation()
    expect(api.lock).toHaveBeenLastCalledWith('any')
    restore()
    expect(api.lock).toHaveBeenLastCalledWith('portrait')
    expect(api.unlock).not.toHaveBeenCalled()
  })

  it('ignores a refused lock and a missing API', () => {
    fakeOrientation(() => Promise.reject(new Error('not allowed')))
    expect(() => allowAnyOrientation()()).not.toThrow()
    Object.defineProperty(screen, 'orientation', { value: undefined, configurable: true })
    expect(() => allowAnyOrientation()()).not.toThrow()
    expect(() => preferPortrait()).not.toThrow()
  })
})
