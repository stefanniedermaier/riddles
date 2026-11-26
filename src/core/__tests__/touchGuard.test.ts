import { describe, expect, it } from 'vitest'

import { createTouchGuard } from '../touchGuard'

const pointer = (pointerId: number, isPrimary: boolean) => ({ pointerId, isPrimary }) as PointerEvent

describe('touch guard', () => {
  it('lets one finger play and blocks a second until every finger is lifted', () => {
    const guard = createTouchGuard()
    expect(guard.down(pointer(1, true))).toBe(true)
    expect(guard.multi).toBe(false)
    expect(guard.down(pointer(2, false))).toBe(false)
    expect(guard.multi).toBe(true)
    guard.up(pointer(1, true))
    expect(guard.multi).toBe(true) // finger 2 is still down
    guard.up(pointer(2, false))
    expect(guard.multi).toBe(false)
    expect(guard.down(pointer(3, true))).toBe(true)
  })

  it('a new primary pointer resets a count whose pointerup never arrived', () => {
    const guard = createTouchGuard()
    guard.down(pointer(1, true))
    guard.down(pointer(2, false))
    guard.up(pointer(1, true)) // finger 2 lifted outside the board
    expect(guard.down(pointer(4, true))).toBe(true)
    expect(guard.multi).toBe(false)
  })
})
