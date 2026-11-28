import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import { useBoardAnimator } from '../animator'
import { CELLS, cellAt, type Board } from '../logic/types'

const piece = (id: number) => ({ id, kind: id % 6, special: 'none' as const })

describe('useBoardAnimator fall', () => {
  it('lets pieces below an obstacle grow in place and pieces from above fall in', async () => {
    vi.useFakeTimers()
    const animator = useBoardAnimator(ref(true))
    const before: Board = Array.from({ length: CELLS }, (_, cell) => piece(cell))
    before[cellAt(7, 0)] = null
    before[cellAt(0, 1)] = null
    animator.show(before)

    const after = [...before]
    after[cellAt(7, 0)] = piece(100)
    after[cellAt(0, 1)] = piece(101)
    const playing = animator.play(
      [
        {
          type: 'fall',
          moves: [],
          spawned: [
            { cell: cellAt(7, 0), piece: piece(100), fromRow: 7 },
            { cell: cellAt(0, 1), piece: piece(101), fromRow: -1 },
          ],
          board: after,
        },
      ],
      after,
    )
    // Right after spawning, before the fall starts.
    const inPlace = animator.pieces.value.find((p) => p.id === 100)!
    expect(inPlace).toMatchObject({ row: 7, appear: true })
    expect(inPlace.land).toBeGreaterThan(0)
    expect(animator.pieces.value.find((p) => p.id === 101)).toMatchObject({ row: -1, appear: false })

    await vi.runAllTimersAsync()
    await playing
    const shown = animator.pieces.value
    expect(shown.find((p) => p.id === 100)).toMatchObject({ appear: true, land: inPlace.land })
    expect(shown.find((p) => p.id === 101)).toMatchObject({ row: 0, appear: false })
    vi.useRealTimers()
  })
})
