/**
 * Turns the engine's phases into a sequence of visual states for the board.
 *
 * Pieces are rendered as absolutely positioned elements keyed by piece id, so the same DOM
 * element follows a piece through swaps and falls and CSS transitions do the animation.
 * The list is kept sorted by id: Vue then never has to move DOM nodes (which would cancel
 * running transitions) – it only appends new and removes cleared pieces.
 */
import { ref, shallowRef, type Ref } from 'vue'

import type { Phase } from './logic/resolve'
import { cloneField, colOf, rowOf, type Board, type Field, type Special } from './logic/types'

export interface DisplayPiece {
  id: number
  kind: number
  special: Special
  row: number
  col: number
  /** Playing the disappear animation. */
  clearing: boolean
  /** Just triggered (flash). */
  firing: boolean
  /** Transition duration for the next position change; 0 = jump. */
  durationMs: number
  /** `fall`: accelerating like gravity (then a squash on landing); `move`: eased. */
  ease: 'move' | 'fall'
  /**
   * Changes whenever the piece falls: the board restarts the landing squash, delayed by
   * `landDelayMs` (the fall duration). 0 = never fell.
   */
  land: number
  landDelayMs: number
}

/**
 * A short visual effect on the board:
 * - `pop`: juice splash where a piece was cleared (in the colour of its kind)
 * - `line-h` / `line-v`: rocket beam along a row or column
 * - `burst`: bomb shockwave
 * - `prism`: rainbow flash
 */
export interface BoardEffect {
  id: number
  type: 'pop' | 'line-h' | 'line-v' | 'burst' | 'prism'
  row: number
  col: number
  kind: number
}

const SWAP_MS = 160
const CLEAR_MS = 260
const FALL_BASE_MS = 110
const FALL_ROW_MS = 55
const SHUFFLE_MS = 380
/** Lifetime of a board effect. */
const EFFECT_MS = 650
/** At most this many juice splashes per clear (big combos would flood the DOM). */
const MAX_POPS = 24

const wait = (ms: number) =>
  ms > 0 ? new Promise<void>((resolve) => setTimeout(resolve, ms)) : Promise.resolve()

/** Waits until the browser has rendered the current state (two animation frames). */
const nextPaint = () =>
  new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame !== 'function') {
      setTimeout(resolve, 16)
      return
    }
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })

export interface PlayCallbacks {
  /**
   * Called when a clear phase starts (score / goal counters can tick up). `cells` are the
   * cleared cells (used to let the points fly from there to the score).
   */
  onClear?: (score: number, cells: number[]) => void
  /** Called when the board had to be shuffled. */
  onShuffle?: () => void
  /** Called when drop items reached the bottom. */
  onCollect?: (count: number) => void
}

export function useBoardAnimator(motion: Ref<boolean>) {
  const pieces = ref<DisplayPiece[]>([])
  /** Obstacles as currently shown (levels only). */
  const field = shallowRef<Field | null>(null)
  const effects = ref<BoardEffect[]>([])
  const animating = ref(false)
  let effectId = 1
  let landId = 1

  function display(board: Board, durationFor: (id: number) => number = () => 0): DisplayPiece[] {
    const list: DisplayPiece[] = []
    // Keep the landing state, so a finished squash is not replayed when the piece re-renders.
    const landed = new Map(pieces.value.map((p) => [p.id, p] as const))
    board.forEach((piece, cell) => {
      if (!piece) return
      list.push({
        id: piece.id,
        kind: piece.kind,
        special: piece.special,
        row: rowOf(cell),
        col: colOf(cell),
        clearing: false,
        firing: false,
        durationMs: durationFor(piece.id),
        ease: 'move',
        land: landed.get(piece.id)?.land ?? 0,
        landDelayMs: landed.get(piece.id)?.landDelayMs ?? 0,
      })
    })
    return list.sort((a, b) => a.id - b.id)
  }

  /** Shows a board (and the obstacles of a level) immediately, without animation. */
  function show(board: Board, levelField?: Field): void {
    pieces.value = display(board)
    field.value = levelField ? cloneField(levelField) : null
  }

  function pieceAt(cell: number): DisplayPiece | undefined {
    const row = rowOf(cell)
    const col = colOf(cell)
    return pieces.value.find((p) => p.row === row && p.col === col && !p.clearing)
  }

  function swapCells(a: number, b: number): void {
    const pa = pieceAt(a)
    const pb = pieceAt(b)
    if (!pa || !pb) return
    pieces.value = pieces.value.map((p) => {
      if (p.id === pa.id) return { ...p, row: pb.row, col: pb.col, durationMs: SWAP_MS }
      if (p.id === pb.id) return { ...p, row: pa.row, col: pa.col, durationMs: SWAP_MS }
      return p
    })
  }

  function addEffects(list: Omit<BoardEffect, 'id'>[]): void {
    if (list.length === 0) return
    const added = list.map((effect) => ({ ...effect, id: effectId++ }))
    const ids = new Set(added.map((effect) => effect.id))
    effects.value = [...effects.value, ...added]
    setTimeout(() => {
      effects.value = effects.value.filter((effect) => !ids.has(effect.id))
    }, EFFECT_MS)
  }

  let stopped = false

  async function playPhase(phase: Phase, callbacks: PlayCallbacks): Promise<void> {
    switch (phase.type) {
      case 'swap': {
        swapCells(phase.a, phase.b)
        await wait(SWAP_MS)
        if (!phase.valid) {
          swapCells(phase.a, phase.b)
          await wait(SWAP_MS)
        }
        return
      }
      case 'clear': {
        const clearing = new Set(phase.cells.map((cell) => pieceAt(cell)?.id))
        const firing = new Set(phase.triggered.map((cell) => pieceAt(cell)?.id))
        const fired: Omit<BoardEffect, 'id'>[] = []
        for (const cell of phase.triggered) {
          const piece = pieceAt(cell)
          if (piece && piece.special !== 'none') {
            fired.push({ type: piece.special, row: rowOf(cell), col: colOf(cell), kind: piece.kind })
          }
        }
        const pops: Omit<BoardEffect, 'id'>[] = []
        for (const cell of phase.cells.slice(0, MAX_POPS)) {
          const piece = pieceAt(cell)
          if (piece) pops.push({ type: 'pop', row: rowOf(cell), col: colOf(cell), kind: piece.kind })
        }
        addEffects([...fired, ...pops])
        pieces.value = pieces.value.map((p) =>
          clearing.has(p.id) ? { ...p, clearing: true, firing: firing.has(p.id) } : p,
        )
        callbacks.onClear?.(phase.score, phase.cells)
        if (phase.field) field.value = phase.field
        await wait(CLEAR_MS)
        pieces.value = display(phase.board)
        return
      }
      case 'collect': {
        const collected = new Set(phase.cells.map((cell) => pieceAt(cell)?.id))
        pieces.value = pieces.value.map((p) => (collected.has(p.id) ? { ...p, clearing: true } : p))
        callbacks.onCollect?.(phase.cells.length)
        field.value = phase.field
        await wait(CLEAR_MS)
        pieces.value = display(phase.board)
        return
      }
      case 'fall': {
        const durations = new Map<number, number>()
        for (const move of phase.moves) {
          durations.set(move.id, FALL_BASE_MS + (rowOf(move.to) - rowOf(move.from)) * FALL_ROW_MS)
        }
        // New pieces start above the board without transition …
        const spawned: DisplayPiece[] = phase.spawned.map(({ cell, piece, fromRow }) => {
          durations.set(piece.id, FALL_BASE_MS + (rowOf(cell) - fromRow) * FALL_ROW_MS)
          return {
            id: piece.id,
            kind: piece.kind,
            special: piece.special,
            row: fromRow,
            col: colOf(cell),
            clearing: false,
            firing: false,
            durationMs: 0,
            ease: 'fall' as const,
            land: 0,
            landDelayMs: 0,
          }
        })
        pieces.value = [...pieces.value, ...spawned].sort((a, b) => a.id - b.id)
        await nextPaint()
        // … and then everything falls into place.
        pieces.value = display(phase.board, (id) => durations.get(id) ?? 0).map((p) => {
          const duration = durations.get(p.id)
          return duration === undefined
            ? p
            : { ...p, ease: 'fall' as const, land: landId++, landDelayMs: duration }
        })
        await wait(Math.max(0, ...durations.values()))
        return
      }
      case 'shuffle': {
        callbacks.onShuffle?.()
        if (phase.field) field.value = phase.field
        pieces.value = display(phase.board, () => SHUFFLE_MS)
        await wait(SHUFFLE_MS)
        return
      }
    }
  }

  /**
   * Animates the phases of one move and ends with `finalBoard` on screen.
   * With reduced motion the result is shown immediately.
   */
  async function play(
    phases: Phase[],
    finalBoard: Board,
    callbacks: PlayCallbacks = {},
    finalField?: Field,
  ) {
    animating.value = true
    try {
      if (motion.value) {
        for (const phase of phases) {
          // Left the game: skip the rest of the show (and its callbacks: points, toasts).
          if (stopped) break
          await playPhase(phase, callbacks)
        }
      } else {
        for (const phase of phases) {
          if (phase.type === 'clear') callbacks.onClear?.(phase.score, phase.cells)
          if (phase.type === 'collect') callbacks.onCollect?.(phase.cells.length)
          if (phase.type === 'shuffle') callbacks.onShuffle?.()
        }
      }
    } finally {
      pieces.value = display(finalBoard)
      if (finalField) field.value = cloneField(finalField)
      animating.value = false
    }
  }

  /** Stops animating for good (the view is gone); a running `play` finishes right away. */
  function stop(): void {
    stopped = true
  }

  return { pieces, effects, animating, field, show, play, stop }
}
