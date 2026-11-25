/**
 * Choosing where a Blocks piece goes: drag from the tray (with a preview of the cells and of
 * the lines it would complete), tap a piece and then a cell, or select it and move the
 * keyboard cursor. `commit` places the piece.
 */
import { computed, ref, type ComputedRef, type Ref, type ShallowRef } from 'vue'

import type { Ghost } from './boardTypes'
import { SIZE, cellsOf, fitsAnywhere, footprint, fullLines, type BlocksRun } from './logic/engine'
import { shapeSize } from './logic/pieces'

export function useBlocksPlacement(options: {
  run: ShallowRef<BlocksRun | null>
  /** The board element and the size of one of its cells in px. */
  boardEl: ComputedRef<HTMLElement | null>
  cellPx: Ref<number>
  /** Re-measures the board (before a drag starts). */
  measure: () => void
  /** No input while animating, a dialog is open or the run is over. */
  locked: ComputedRef<boolean>
  commit: (slot: number, anchor: number) => void
}) {
  const { run, boardEl, cellPx, measure, locked, commit } = options


  const selected = ref<number | null>(null)
  const cursor = ref<number | null>(null)

  interface Drag {
    slot: number
    pointerId: number
    pointerType: string
    startX: number
    startY: number
    x: number
    y: number
    moved: boolean
  }
  const drag = ref<Drag | null>(null)

  /** Top-left of the dragged piece in viewport px: above the finger on touch, centred for mice. */
  const dragBox = computed(() => {
    const d = drag.value
    const piece = d ? run.value?.tray[d.slot] : null
    if (!d || !piece) return null
    const { rows, cols } = shapeSize(cellsOf(piece))
    const lift = d.pointerType === 'mouse' ? (rows * cellPx.value) / 2 : rows * cellPx.value + cellPx.value * 0.9
    return { left: d.x - (cols * cellPx.value) / 2, top: d.y - lift, piece }
  })

  /** Anchor cell under the dragged piece (nearest cell to its top-left corner). */
  const dragAnchor = computed<number | null>(() => {
    const box = dragBox.value
    const rect = boardEl.value?.getBoundingClientRect()
    if (!box || !rect || !drag.value?.moved) return null
    const col = Math.round((box.left - rect.left) / cellPx.value)
    const row = Math.round((box.top - rect.top) / cellPx.value)
    if (row < -2 || col < -2 || row >= SIZE || col >= SIZE) return null
    if (row < 0 || col < 0) return null
    return row * SIZE + col
  })

  /** Slot and anchor of the current preview (drag, or keyboard cursor with a selected piece). */
  const preview = computed<{ slot: number; anchor: number } | null>(() => {
    if (drag.value && dragAnchor.value !== null) return { slot: drag.value.slot, anchor: dragAnchor.value }
    if (!drag.value && selected.value !== null && cursor.value !== null) {
      return { slot: selected.value, anchor: cursor.value }
    }
    return null
  })

  const ghost = computed<Ghost | null>(() => {
    const p = preview.value
    const current = run.value
    const piece = p && current ? current.tray[p.slot] : null
    if (!p || !current || !piece) return null
    const cells = footprint(current.board, piece, p.anchor)
    return cells ? { cells, color: piece.color } : null
  })

  /** Cells of the lines that the preview would complete. */
  const completing = computed<Set<number> | null>(() => {
    const g = ghost.value
    const current = run.value
    if (!g || !current) return null
    const board = current.board.slice()
    for (const cell of g.cells) board[cell] = 1
    const { rows, cols } = fullLines(board)
    if (rows.length + cols.length === 0) return null
    const cells = new Set<number>()
    for (const row of rows) for (let c = 0; c < SIZE; c++) cells.add(row * SIZE + c)
    for (const col of cols) for (let r = 0; r < SIZE; r++) cells.add(r * SIZE + col)
    return cells
  })

  const fits = computed(() =>
    (run.value?.tray ?? []).map((piece) => (piece && run.value ? fitsAnywhere(run.value.board, piece) : false)),
  )

  function onTrayPointerDown(slot: number, event: PointerEvent): void {
    if (locked.value || !run.value?.tray[slot] || !event.isPrimary) return
    measure()
    try {
      // Keeps move/up events on the tray button while the finger is over the board.
      ;(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId)
    } catch {
      // Pointer already gone – the drag simply ends on the next event.
    }
    drag.value = {
      slot,
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      moved: false,
    }
  }

  function onTrayPointerMove(event: PointerEvent): void {
    const d = drag.value
    if (!d || d.pointerId !== event.pointerId) return
    const moved = d.moved || Math.hypot(event.clientX - d.startX, event.clientY - d.startY) > 8
    drag.value = { ...d, x: event.clientX, y: event.clientY, moved }
  }

  function onTrayPointerUp(event: PointerEvent): void {
    const d = drag.value
    if (!d || d.pointerId !== event.pointerId) return
    const target = preview.value
    const valid = ghost.value !== null
    drag.value = null
    if (!d.moved) {
      // A tap: select (or deselect) the piece for tap-to-place.
      selected.value = selected.value === d.slot ? null : d.slot
      return
    }
    if (target && valid) commit(target.slot, target.anchor)
  }

  function onTrayPointerCancel(): void {
    drag.value = null
  }

  /** Tap on the board with a selected piece: the piece is centred on the tapped cell. */
  function onBoardTap(cell: number): void {
    const current = run.value
    const slot = selected.value
    if (locked.value || !current || slot === null) return
    const piece = current.tray[slot]
    if (!piece) return
    const { rows, cols } = shapeSize(cellsOf(piece))
    const row = Math.min(Math.max(Math.floor(cell / SIZE) - Math.floor((rows - 1) / 2), 0), SIZE - rows)
    const col = Math.min(Math.max((cell % SIZE) - Math.floor((cols - 1) / 2), 0), SIZE - cols)
    commit(slot, row * SIZE + col)
  }

  return {
    selected,
    cursor,
    drag,
    dragBox,
    preview,
    ghost,
    completing,
    fits,
    onTrayPointerDown,
    onTrayPointerMove,
    onTrayPointerUp,
    onTrayPointerCancel,
    onBoardTap,
  }
}
