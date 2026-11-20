import { describe, expect, it } from 'vitest'

import { createRng } from '@/core/rng'
import { createBoard, findAnyMove, isItemDrop, isValidSwap, listMoves, shuffleBoard } from '../board'
import { findMatches } from '../match'
import { createLevelField, getLevel } from '../levels'
import { createRun, playMove } from '../modes'
import { resolveMove, type ClearPhase, type FallPhase, type Phase } from '../resolve'
import { CELLS, ITEM_KIND, SIZE, emptyField, type Board, type Field } from '../types'
import { at, context, patternBoard, set } from './helpers'

const clears = (phases: Phase[]) => phases.filter((p): p is ClearPhase => p.type === 'clear')
const falls = (phases: Phase[]) => phases.filter((p): p is FallPhase => p.type === 'fall')

function field(options: {
  crates?: [number, number, number][]
  chains?: [number, number][]
  targets?: [number, number][]
  itemsPending?: number
  maxItems?: number
}): Field {
  const f = emptyField()
  for (const [r, c, hp] of options.crates ?? []) f.crates[at(r, c)] = hp
  for (const [r, c] of options.chains ?? []) f.chains[at(r, c)] = 1
  for (const [r, c] of options.targets ?? []) f.targets[at(r, c)] = 1
  f.itemsPending = options.itemsPending ?? 0
  f.maxItems = options.maxItems ?? 0
  return f
}

const item = (id: number) => ({ id, kind: ITEM_KIND, special: 'none' as const })

/** R R B R on row 3: moving (3,3) → (3,2) clears (3,0)–(3,2). */
function threeBoard(): Board {
  return set(patternBoard(), [
    [3, 0, 'R'],
    [3, 1, 'R'],
    [3, 2, 'B'],
    [3, 3, 'R'],
  ])
}

/** Structural invariants of a stable level board. */
function expectValidLevelBoard(board: Board, f: Field) {
  for (let cell = 0; cell < CELLS; cell++) {
    if (f.crates[cell]! > 0) expect(board[cell], `crate cell ${cell}`).toBeNull()
    else expect(board[cell], `cell ${cell}`).not.toBeNull()
  }
  expect(findMatches(board)).toEqual([])
  expect(findAnyMove(board, f)).not.toBeNull()
  const ids = board.filter((p) => p !== null).map((p) => p!.id)
  expect(new Set(ids).size).toBe(ids.length)
}

describe('chains', () => {
  it('chained pieces cannot be swapped', () => {
    const board = threeBoard()
    const f = field({ chains: [[3, 3]] })
    expect(isValidSwap(board, at(3, 3), at(3, 2), f)).toBe(false)
    expect(resolveMove(board, at(3, 3), at(3, 2), context(), f).valid).toBe(false)
    expect(resolveMove(board, at(3, 3), at(3, 2), context()).valid).toBe(true)
  })

  it('a chained piece in a match loses its chain but stays', () => {
    const board = threeBoard()
    const chained = board[at(3, 0)]!
    const f = field({ chains: [[3, 0]] })
    const result = resolveMove(board, at(3, 3), at(3, 2), context(), f)
    expect(result.valid).toBe(true)
    const [first] = clears(result.phases)
    expect(first!.cells).toEqual([at(3, 1), at(3, 2)])
    expect(result.summary.chainsFreed).toBe(1)
    expect(result.field!.chains[at(3, 0)]).toBe(0)
    expect(f.chains[at(3, 0)]).toBe(1) // input untouched
    expect(first!.board[at(3, 0)]).toEqual(chained)
  })

  it('a special hitting a chained piece frees it without clearing it', () => {
    const board = set(threeBoard(), [[3, 0, 'Rh']])
    const chained = board[at(3, 6)]!
    const f = field({ chains: [[3, 6]] })
    const result = resolveMove(board, at(3, 3), at(3, 2), context(), f)
    const [first] = clears(result.phases)
    expect(first!.cells).not.toContain(at(3, 6))
    expect(first!.board[at(3, 6)]).toEqual(chained)
    expect(result.field!.chains[at(3, 6)]).toBe(0)
  })

  it('chained pieces do not fall; cells below them are refilled in place', () => {
    // Clear (5,2)–(5,4); column 3 has a chained piece at (2,3).
    const board = set(patternBoard(), [
      [5, 2, 'G'],
      [5, 3, 'G'],
      [5, 4, 'B'],
      [5, 5, 'G'],
    ])
    const chained = board[at(2, 3)]!
    const f = field({ chains: [[2, 3]] })
    const result = resolveMove(board, at(5, 5), at(5, 4), context(), f)
    const [fall] = falls(result.phases)
    expect(fall!.board[at(2, 3)]).toEqual(chained)
    expect(fall!.moves.some((m) => m.from === at(2, 3))).toBe(false)
    // Column 3 below the chain: rows 3–4 fall by one, row 3 gets a new piece in place.
    const spawn = fall!.spawned.find((s) => s.cell === at(3, 3))
    expect(spawn).toBeDefined()
    expect(spawn!.fromRow).toBe(3)
    expectValidLevelBoard(result.board, result.field!)
  })
})

describe('crates', () => {
  it('crate cells hold no piece and block falling', () => {
    const ctx = context(3, 6, 1)
    const f = field({ crates: [[4, 3, 1]] })
    const board = createBoard(ctx, f)
    expect(board[at(4, 3)]).toBeNull()
    expectValidLevelBoard(board, f)
    // Swapping into a crate is impossible.
    expect(isValidSwap(board, at(3, 3), at(4, 3), f)).toBe(false)
  })

  it('a match next to a crate damages it; destroyed crates are refilled', () => {
    const board = threeBoard()
    board[at(2, 1)] = null
    const f = field({ crates: [[2, 1, 1]] })
    const result = resolveMove(board, at(3, 3), at(3, 2), context(), f)
    expect(result.valid).toBe(true)
    expect(result.summary.cratesDestroyed).toBe(1)
    expect(result.field!.crates[at(2, 1)]).toBe(0)
    expect(clears(result.phases)[0]!.field!.crates[at(2, 1)]).toBe(0)
    expectValidLevelBoard(result.board, result.field!)
  })

  it('strong crates need two hits', () => {
    const board = threeBoard()
    board[at(2, 1)] = null
    const f = field({ crates: [[2, 1, 2]] })
    const result = resolveMove(board, at(3, 3), at(3, 2), context(), f)
    expect(result.summary.cratesDestroyed).toBe(0)
    expect(result.field!.crates[at(2, 1)]).toBe(1)
    expect(result.board[at(2, 1)]).toBeNull()
  })

  it('specials damage crates in their path', () => {
    const board = set(threeBoard(), [[3, 0, 'Rh']])
    board[at(3, 6)] = null
    const f = field({ crates: [[3, 6, 2]] })
    const result = resolveMove(board, at(3, 3), at(3, 2), context(), f)
    expect(result.field!.crates[at(3, 6)]).toBe(1)
  })
})

describe('target tiles', () => {
  it('are cleared when the piece on them is cleared', () => {
    const f = field({ targets: [[3, 1], [6, 6]] })
    const result = resolveMove(threeBoard(), at(3, 3), at(3, 2), context(), f)
    expect(result.summary.targetsCleared).toBeGreaterThanOrEqual(1)
    expect(result.field!.targets[at(3, 1)]).toBe(0)
  })
})

describe('drop items', () => {
  it('can always be moved one row down, even without a match', () => {
    const board = patternBoard()
    board[at(5, 3)] = item(500)
    const f = field({})
    expect(isItemDrop(board, at(5, 3), at(6, 3))).toBe(true)
    expect(isItemDrop(board, at(6, 3), at(5, 3))).toBe(true)
    expect(isItemDrop(board, at(5, 3), at(4, 3))).toBe(false) // not upwards
    expect(isItemDrop(board, at(5, 3), at(5, 4))).toBe(false) // not sideways
    const result = resolveMove(board, at(5, 3), at(6, 3), context(), f)
    expect(result.valid).toBe(true)
    expect(result.board[at(6, 3)]!.kind).toBe(ITEM_KIND)
    // Without a field (Zen / Time) there are no items and no free moves.
    expect(resolveMove(board, at(5, 3), at(6, 3), context()).valid).toBe(false)
  })

  it('are collected at the bottom row and the board is refilled', () => {
    const board = patternBoard()
    board[at(6, 3)] = item(500)
    const f = field({})
    const result = resolveMove(board, at(6, 3), at(7, 3), context(), f)
    expect(result.valid).toBe(true)
    expect(result.summary.itemsCollected).toBe(1)
    expect(result.phases.some((p) => p.type === 'collect')).toBe(true)
    expect(result.board.some((p) => p?.kind === ITEM_KIND)).toBe(false)
    expectValidLevelBoard(result.board, result.field!)
  })

  it('fall when pieces below them are cleared and are immune to specials', () => {
    // Row 3: line special match; item above it at (2,1) and in the row at (3,6).
    const board = set(threeBoard(), [[3, 0, 'Rh']])
    board[at(2, 1)] = item(500)
    board[at(3, 6)] = item(501)
    const result = resolveMove(board, at(3, 3), at(3, 2), context(), field({}))
    const [first] = clears(result.phases)
    expect(first!.cells).not.toContain(at(3, 6))
    const items = result.board.flatMap((p, cell) => (p?.kind === ITEM_KIND ? [cell] : []))
    expect(items).toContain(at(3, 6))
    expect(items).toContain(at(3, 1)) // fell one row
  })

  it('a prism swapped with an item clears the most common kind', () => {
    const board = set(patternBoard(), [[4, 4, '*']])
    board[at(4, 5)] = item(500)
    const result = resolveMove(board, at(4, 4), at(4, 5), context(), field({}))
    expect(result.valid).toBe(true)
    expect(result.board.some((p) => p?.id === 500)).toBe(true)
    expect(result.summary.cleared).toBeGreaterThan(5)
  })

  it('pending items enter from the top in a middle column', () => {
    const f = field({ itemsPending: 1, maxItems: 1 })
    const result = resolveMove(threeBoard(), at(3, 3), at(3, 2), context(), f)
    expect(result.field!.itemsPending).toBe(0)
    const cells = result.board.flatMap((p, cell) => (p?.kind === ITEM_KIND ? [cell] : []))
    expect(cells).toHaveLength(1)
    // Refill slots exist in columns 0–2 only; column 2 is the only middle column among them.
    expect(cells[0]! % SIZE).toBe(2)
  })
})

describe('obstacles in play', () => {
  it('shuffling keeps crates, chained pieces and items in place', () => {
    const ctx = context(9, 6, 1)
    const f = field({ crates: [[2, 2, 1]], chains: [[4, 4], [5, 1]] })
    const board = createBoard(ctx, f, [at(1, 6)])
    const before = board.slice()
    shuffleBoard(board, ctx, f)
    for (const cell of [at(2, 2), at(4, 4), at(5, 1), at(1, 6)]) expect(board[cell]).toEqual(before[cell])
    expectValidLevelBoard(board, f)
  })

  it('random play on obstacle levels keeps every invariant and is deterministic', () => {
    for (const level of [3, 5, 7, 9, 13, 24, 27, 50]) {
      const play = () => {
        const rng = createRng(level)
        let run = createRun('levels', 0, level)
        const states: string[] = []
        for (let turn = 0; turn < 25; turn++) {
          const f = run.level!.field
          expectValidLevelBoard(run.board, f)
          const moves = listMoves(run.board, f)
          const move = moves[rng.int(moves.length)]!
          const outcome = playMove(run, move.a, move.b)
          expect(outcome.result.valid).toBe(true)
          run = { ...outcome.run, level: { ...outcome.run.level!, movesLeft: 99 } }
          states.push(JSON.stringify(run.board.map((p) => p?.id ?? 0)))
        }
        return states
      }
      expect(play()).toEqual(play())
    }
  })

  it('creates level boards with their layout', () => {
    for (const level of [3, 5, 7, 9]) {
      const def = getLevel(level)
      const run = createRun('levels', 0, level)
      expect(run.level!.field).toEqual(createLevelField(def))
      for (const cell of def.layout.itemStart) expect(run.board[cell]!.kind).toBe(ITEM_KIND)
      expectValidLevelBoard(run.board, run.level!.field)
    }
  })
})
