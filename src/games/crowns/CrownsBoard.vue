<script setup lang="ts">
import { computed, ref } from 'vue'

import { t } from '@/core/i18n'
import { resolvedTheme } from '@/core/theme'
import CrownGlyph from './CrownGlyph.vue'
import { CROWN, EMPTY, MARK, type CellState } from './logic/types'
import { regionColor } from './palette'

export interface BoardHighlight {
  /** Cells tinted as part of the explaining unit(s). */
  tint: ReadonlySet<number>
  /** Cells outlined. */
  focus: ReadonlySet<number>
  /** Preview of what applying the hint would change. */
  ghost: ReadonlyMap<number, 'mark' | 'crown'>
}

const props = defineProps<{
  size: number
  regions: readonly number[]
  cells: readonly CellState[]
  conflicts?: readonly boolean[] | null
  blocked?: readonly boolean[] | null
  highlight?: BoardHighlight | null
  disabled?: boolean
  solved?: boolean
}>()

const emit = defineEmits<{
  /** Single tap: cycle empty → ✕ → crown → empty. */
  tap: [cell: number]
  /** Drag painting of one cell. */
  paint: [cell: number, value: CellState]
  /** A drag stroke ended (save now). */
  strokeEnd: []
}>()

const board = ref<HTMLElement | null>(null)
const total = computed(() => props.size * props.size)

// --- Appearance --------------------------------------------------------------

const THICK = '1.5px'
const THIN = '0.5px'

function cellStyle(cell: number): Record<string, string> {
  const n = props.size
  const r = Math.floor(cell / n)
  const c = cell % n
  const region = props.regions[cell]
  const side = (other: number, inside: boolean) =>
    !inside ? '0' : props.regions[other] === region ? THIN : THICK
  const sideColor = (other: number, inside: boolean) =>
    inside && props.regions[other] !== region ? 'var(--crowns-line-strong)' : 'var(--crowns-line)'
  return {
    background: regionColor(resolvedTheme.value, region ?? 0),
    borderTopWidth: side(cell - n, r > 0),
    borderBottomWidth: side(cell + n, r < n - 1),
    borderLeftWidth: side(cell - 1, c > 0),
    borderRightWidth: side(cell + 1, c < n - 1),
    borderTopColor: sideColor(cell - n, r > 0),
    borderBottomColor: sideColor(cell + n, r < n - 1),
    borderLeftColor: sideColor(cell - 1, c > 0),
    borderRightColor: sideColor(cell + 1, c < n - 1),
  }
}

function cellLabel(cell: number): string {
  const n = props.size
  const state = props.cells[cell]
  const symbol = state === CROWN ? '♛' : state === MARK ? '✕' : ''
  return `${t('crowns.unit.row', { n: Math.floor(cell / n) + 1 })}, ${t('crowns.unit.col', {
    n: (cell % n) + 1,
  })} ${symbol}`.trim()
}

// --- Pointer input: tap or drag-to-mark ----------------------------------------

interface Stroke {
  pointerId: number
  startCell: number
  lastCell: number
  /** Value painted while dragging, `null` when the stroke started on a crown. */
  value: CellState | null
  painted: Set<number>
  moved: boolean
}

let stroke: Stroke | null = null

function cellAt(event: PointerEvent): number {
  const el = board.value
  if (!el) return -1
  const rect = el.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) return -1
  const col = Math.floor((x / rect.width) * props.size)
  const row = Math.floor((y / rect.height) * props.size)
  return row * props.size + col
}

function paintCell(cell: number): void {
  if (!stroke || stroke.value === null || stroke.painted.has(cell)) return
  stroke.painted.add(cell)
  const current = props.cells[cell]
  if (stroke.value === MARK && current === EMPTY) emit('paint', cell, MARK)
  else if (stroke.value === EMPTY && current === MARK) emit('paint', cell, EMPTY)
}

function onPointerDown(event: PointerEvent): void {
  if (props.disabled || (event.pointerType === 'mouse' && event.button !== 0)) return
  const cell = cellAt(event)
  if (cell < 0) return
  try {
    board.value?.setPointerCapture(event.pointerId)
  } catch {
    // Not supported (e.g. synthetic events) – dragging still works within the board.
  }
  const state = props.cells[cell]
  stroke = {
    pointerId: event.pointerId,
    startCell: cell,
    lastCell: cell,
    value: state === EMPTY ? MARK : state === MARK ? EMPTY : null,
    painted: new Set(),
    moved: false,
  }
  focusCell.value = cell
}

function onPointerMove(event: PointerEvent): void {
  if (!stroke || event.pointerId !== stroke.pointerId) return
  const cell = cellAt(event)
  if (cell < 0 || cell === stroke.lastCell) return
  if (!stroke.moved) {
    stroke.moved = true
    paintCell(stroke.startCell)
  }
  stroke.lastCell = cell
  paintCell(cell)
}

function onPointerUp(event: PointerEvent): void {
  if (!stroke || event.pointerId !== stroke.pointerId) return
  const finished = stroke
  stroke = null
  if (finished.moved) emit('strokeEnd')
  else emit('tap', finished.startCell)
}

function onPointerCancel(): void {
  if (stroke?.moved) emit('strokeEnd')
  stroke = null
}

// --- Keyboard input -------------------------------------------------------------

const focusCell = ref(0)

function onKeydown(event: KeyboardEvent): void {
  if (props.disabled) return
  const n = props.size
  let r = Math.floor(focusCell.value / n)
  let c = focusCell.value % n
  switch (event.key) {
    case 'ArrowUp':
      r = Math.max(0, r - 1)
      break
    case 'ArrowDown':
      r = Math.min(n - 1, r + 1)
      break
    case 'ArrowLeft':
      c = Math.max(0, c - 1)
      break
    case 'ArrowRight':
      c = Math.min(n - 1, c + 1)
      break
    case ' ':
    case 'Enter':
      emit('tap', focusCell.value)
      event.preventDefault()
      return
    default:
      return
  }
  event.preventDefault()
  focusCell.value = r * n + c
}
</script>

<template>
  <div
    ref="board"
    class="crowns-board no-select"
    :class="{ 'crowns-board--solved': solved, 'crowns-board--disabled': disabled }"
    :style="{ '--n': size }"
    role="grid"
    :aria-label="t('crowns.name')"
    tabindex="0"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerCancel"
    @lostpointercapture="onPointerCancel"
    @keydown="onKeydown"
    @contextmenu.prevent
  >
    <div
      v-for="cell in total"
      :key="cell - 1"
      class="cell"
      role="gridcell"
      :aria-label="cellLabel(cell - 1)"
      :class="{
        'cell--tint': highlight?.tint.has(cell - 1),
        'cell--focus': highlight?.focus.has(cell - 1),
        'cell--cursor': focusCell === cell - 1,
      }"
      :style="cellStyle(cell - 1)"
    >
      <span
        v-if="cells[cell - 1] === CROWN"
        class="cell__crown"
        :class="{ 'cell__crown--conflict': conflicts?.[cell - 1] }"
        :style="{ '--i': cell - 1 }"
      >
        <CrownGlyph />
      </span>
      <svg v-else-if="cells[cell - 1] === MARK" class="cell__mark" viewBox="0 0 10 10" aria-hidden="true">
        <path d="M2 2l6 6M8 2l-6 6" />
      </svg>
      <span v-else-if="blocked?.[cell - 1]" class="cell__dot" aria-hidden="true" />

      <template v-if="highlight?.ghost.has(cell - 1) && cells[cell - 1] === EMPTY">
        <span v-if="highlight.ghost.get(cell - 1) === 'crown'" class="cell__crown cell__ghost">
          <CrownGlyph />
        </span>
        <svg v-else class="cell__mark cell__ghost" viewBox="0 0 10 10" aria-hidden="true">
          <path d="M2 2l6 6M8 2l-6 6" />
        </svg>
      </template>
    </div>
  </div>
</template>

<style scoped>
.crowns-board {
  --crowns-line: color-mix(in srgb, var(--color-border-strong) 22%, transparent);
  --crowns-line-strong: var(--color-border-strong);

  display: grid;
  grid-template-columns: repeat(var(--n), 1fr);
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  border: 3px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  touch-action: none;
  outline: none;
  cursor: pointer;
}

.crowns-board--disabled {
  cursor: default;
}

.cell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  border-style: solid;
  color: var(--color-text);
}

.cell--tint {
  box-shadow: inset 0 0 0 999px color-mix(in srgb, var(--color-accent) 28%, transparent);
}

.cell--focus {
  z-index: 1;
  outline: 3px solid var(--color-accent);
  outline-offset: -3px;
}

.crowns-board:focus-visible .cell--cursor {
  z-index: 2;
  outline: 3px dashed var(--color-text);
  outline-offset: -4px;
}

.cell__crown {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--color-text);
  animation: crown-pop var(--dur-med) var(--ease-out);
}

.cell__crown--conflict {
  color: var(--color-error);
}

.cell__mark {
  width: 34%;
  height: 34%;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  opacity: 0.6;
}

.cell__dot {
  width: 14%;
  height: 14%;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.35;
}

.cell__ghost {
  position: absolute;
  inset: 0;
  margin: auto;
  color: var(--color-accent);
  opacity: 0.75;
  animation: ghost-pulse 1.4s ease-in-out infinite;
}

.cell__mark.cell__ghost {
  stroke: var(--color-accent);
  opacity: 0.9;
}

.crowns-board--solved .cell__crown {
  animation: crown-celebrate var(--dur-slow) var(--ease-out) both;
  animation-delay: calc(var(--i) * 6ms);
  color: var(--game-crowns);
}

:root[data-motion='reduced'] .cell__ghost {
  animation: none;
}

@keyframes crown-pop {
  from {
    transform: scale(0.4);
    opacity: 0;
  }
}

@keyframes crown-celebrate {
  50% {
    transform: scale(1.3) rotate(-8deg);
  }
}

@keyframes ghost-pulse {
  50% {
    opacity: 0.3;
  }
}
</style>
