/**
 * Turns the engine's phases into a sequence of visual states for the board.
 *
 * Pieces are rendered as absolutely positioned elements keyed by piece id, so the same DOM
 * element follows a piece through swaps and falls and CSS transitions do the animation.
 * The list is kept sorted by id: Vue then never has to move DOM nodes (which would cancel
 * running transitions) – it only appends new and removes cleared pieces.
 */
import { ref, type Ref } from 'vue'

import type { Phase } from './logic/resolve'
import { colOf, rowOf, type Board, type Special } from './logic/types'

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
}

export interface ScorePopup {
  id: number
  row: number
  col: number
  text: string
}

export const SWAP_MS = 160
export const CLEAR_MS = 230
export const FALL_BASE_MS = 110
export const FALL_ROW_MS = 55
export const SHUFFLE_MS = 380
export const POPUP_MS = 900

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
  /** Called when a clear phase starts (score / goal counters can tick up). */
  onClear?: (score: number) => void
  /** Called when the board had to be shuffled. */
  onShuffle?: () => void
}

export function useBoardAnimator(motion: Ref<boolean>) {
  const pieces = ref<DisplayPiece[]>([])
  const popups = ref<ScorePopup[]>([])
  const animating = ref(false)
  let popupId = 1

  function display(board: Board, durationFor: (id: number) => number = () => 0): DisplayPiece[] {
    const list: DisplayPiece[] = []
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
      })
    })
    return list.sort((a, b) => a.id - b.id)
  }

  /** Shows a board immediately, without animation. */
  function show(board: Board): void {
    pieces.value = display(board)
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

  function addPopup(cells: number[], score: number): void {
    if (score <= 0 || cells.length === 0) return
    const row = cells.reduce((sum, cell) => sum + rowOf(cell), 0) / cells.length
    const col = cells.reduce((sum, cell) => sum + colOf(cell), 0) / cells.length
    const id = popupId++
    popups.value = [...popups.value, { id, row, col, text: `+${score}` }]
    setTimeout(() => {
      popups.value = popups.value.filter((popup) => popup.id !== id)
    }, POPUP_MS)
  }

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
        pieces.value = pieces.value.map((p) =>
          clearing.has(p.id) ? { ...p, clearing: true, firing: firing.has(p.id) } : p,
        )
        callbacks.onClear?.(phase.score)
        addPopup(phase.cells, phase.score)
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
          }
        })
        pieces.value = [...pieces.value, ...spawned].sort((a, b) => a.id - b.id)
        await nextPaint()
        // … and then everything falls into place.
        pieces.value = display(phase.board, (id) => durations.get(id) ?? 0)
        await wait(Math.max(0, ...durations.values()))
        return
      }
      case 'shuffle': {
        callbacks.onShuffle?.()
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
  async function play(phases: Phase[], finalBoard: Board, callbacks: PlayCallbacks = {}) {
    animating.value = true
    try {
      if (motion.value) {
        for (const phase of phases) await playPhase(phase, callbacks)
      } else {
        for (const phase of phases) {
          if (phase.type === 'clear') callbacks.onClear?.(phase.score)
          if (phase.type === 'shuffle') callbacks.onShuffle?.()
        }
      }
    } finally {
      pieces.value = display(finalBoard)
      animating.value = false
    }
  }

  return { pieces, popups, animating, show, play }
}
