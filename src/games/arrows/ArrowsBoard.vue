<script setup lang="ts">
import { computed, ref } from 'vue'

import { t } from '@/core/i18n'
import { resolvedTheme } from '@/core/theme'
import { headOf, rayCells } from './logic/analysis'
import { DELTAS, type Arrow, type Direction } from './logic/types'
import { arrowColor } from './palette'
import { arrowsSettings } from './settings'

export interface LeavingArrow {
  id: number
  /** Unique per animation run (restarts the CSS animation). */
  key: number
}

export interface Bump {
  arrow: number
  blocker: number
  key: number
}

const props = defineProps<{
  size: number
  arrows: readonly Arrow[]
  /** Arrows that already left (and are not animating any more). */
  removed: readonly number[]
  /** Arrows currently sliding out. */
  leaving: readonly LeavingArrow[]
  bump?: Bump | null
  /** Arrow highlighted by a hint. */
  highlight?: number | null
  /** Show the way of a bumped arrow up to its blocker. */
  showBlockedPath?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{ tap: [cell: number] }>()

const board = ref<HTMLElement | null>(null)
const total = computed(() => props.size * props.size)
const DIRECTION_KEYS = ['up', 'right', 'down', 'left'] as const

const leavingIds = computed(() => new Map(props.leaving.map((entry) => [entry.id, entry.key])))

/** Arrows drawn on the board: still present or currently leaving. */
const shown = computed(() => {
  const removed = new Set(props.removed)
  return props.arrows.filter((arrow) => !removed.has(arrow.id) || leavingIds.value.has(arrow.id))
})

/** Arrow id per cell for accessibility labels (leaving arrows excluded). */
const owners = computed(() => {
  const owners = new Array<number>(total.value).fill(-1)
  const removed = new Set(props.removed)
  for (const arrow of props.arrows) {
    if (removed.has(arrow.id)) continue
    for (const cell of arrow.cells) owners[cell] = arrow.id
  }
  return owners
})

const center = (cell: number) => ({ x: (cell % props.size) + 0.5, y: Math.floor(cell / props.size) + 0.5 })
const unit = (dir: Direction) => ({ x: DELTAS[dir][1], y: DELTAS[dir][0] })

interface DrawnArrow {
  id: number
  color: string
  points: string
  head: string
  /** Body path extended straight out of the board (used while leaving). */
  exitPoints: string
  /** Length of the visible body (board units). */
  length: number
  /** How far the arrow travels while leaving (board units). */
  travel: number
  /** Direction of travel. */
  dx: number
  dy: number
  leaveKey: number | undefined
}

const drawn = computed<DrawnArrow[]>(() =>
  shown.value.map((arrow) => {
    const d = unit(arrow.dir)
    const c = center(headOf(arrow))
    const body = arrow.cells.map(center)
    if (body.length === 1) body.unshift({ x: c.x - d.x * 0.32, y: c.y - d.y * 0.32 })
    // End the shaft inside the arrowhead so the round cap does not poke out.
    body[body.length - 1] = { x: c.x + d.x * 0.05, y: c.y + d.y * 0.05 }
    const p = { x: -d.y, y: d.x }
    const tip = { x: c.x + d.x * 0.4, y: c.y + d.y * 0.4 }
    const b1 = { x: c.x - d.x * 0.08 + p.x * 0.3, y: c.y - d.y * 0.08 + p.y * 0.3 }
    const b2 = { x: c.x - d.x * 0.08 - p.x * 0.3, y: c.y - d.y * 0.08 - p.y * 0.3 }
    let length = 0
    for (let i = 1; i < body.length; i++) {
      length += Math.hypot(body[i]!.x - body[i - 1]!.x, body[i]!.y - body[i - 1]!.y)
    }
    // Far enough for the tail to follow the head out of the board along a straight line.
    const travel = props.size + length + 1
    const end = body[body.length - 1]!
    const exit = [...body, { x: end.x + d.x * travel, y: end.y + d.y * travel }]
    return {
      id: arrow.id,
      color: arrowColor(resolvedTheme.value, arrow.dir, arrowsSettings.value.colorByDirection),
      points: body.map((pt) => `${pt.x},${pt.y}`).join(' '),
      head: `M${tip.x},${tip.y}L${b1.x},${b1.y}L${b2.x},${b2.y}Z`,
      exitPoints: exit.map((pt) => `${pt.x},${pt.y}`).join(' '),
      length,
      travel,
      dx: d.x,
      dy: d.y,
      leaveKey: leavingIds.value.get(arrow.id),
    }
  }),
)

/** Cells between a bumped arrow's head and its blocker (for the optional highlight). */
const bumpPath = computed(() => {
  const bump = props.bump
  if (!bump || !props.showBlockedPath) return []
  const arrow = props.arrows[bump.arrow]
  const blocker = props.arrows[bump.blocker]
  if (!arrow || !blocker) return []
  const blockerCells = new Set(blocker.cells)
  const path: number[] = []
  for (const cell of rayCells(props.size, headOf(arrow), arrow.dir)) {
    if (blockerCells.has(cell)) break
    path.push(cell)
  }
  return path.map((cell) => ({ key: `${bump.key}-${cell}`, ...center(cell) }))
})

function arrowClasses(arrow: DrawnArrow): Record<string, boolean> {
  return {
    'arrow--leaving': arrow.leaveKey !== undefined,
    'arrow--bump': props.bump?.arrow === arrow.id,
    'arrow--blocker': props.bump?.blocker === arrow.id,
    'arrow--hint': props.highlight === arrow.id,
  }
}

function arrowStyle(arrow: DrawnArrow): Record<string, string> {
  return {
    '--dx': `${arrow.dx * arrow.travel}px`,
    '--dy': `${arrow.dy * arrow.travel}px`,
    '--bx': `${arrow.dx * 0.22}px`,
    '--by': `${arrow.dy * 0.22}px`,
    // The body is a dash of its own length sliding along the extended path: the head runs
    // ahead in the arrow's direction while the tail follows the bends and straightens out.
    '--length': `${arrow.length}`,
    '--gap': `${arrow.length + arrow.travel + 1}`,
    '--travel': `${-arrow.travel}`,
  }
}

function cellLabel(cell: number): string {
  const position = t('arrows.play.cell', {
    row: Math.floor(cell / props.size) + 1,
    col: (cell % props.size) + 1,
  })
  const owner = owners.value[cell]!
  if (owner < 0) return position
  const direction = t(`arrows.directions.${DIRECTION_KEYS[props.arrows[owner]!.dir]}`)
  return `${position}, ${t('arrows.play.arrowLabel', { direction })}`
}

// --- Pointer input: a tap is a press and release on the same cell -----------------

let downCell = -1
let downId: number | null = null

function cellAt(event: PointerEvent): number {
  const el = board.value
  if (!el) return -1
  const hit =
    typeof document.elementFromPoint === 'function'
      ? document.elementFromPoint(event.clientX, event.clientY)
      : null
  const cellEl = hit?.closest<HTMLElement>('[data-cell]')
  if (cellEl && el.contains(cellEl)) return Number(cellEl.dataset.cell)

  const rect = el.getBoundingClientRect()
  const width = el.clientWidth || rect.width
  const height = el.clientHeight || rect.height
  const x = event.clientX - rect.left - el.clientLeft
  const y = event.clientY - rect.top - el.clientTop
  if (x < 0 || y < 0 || x >= width || y >= height) return -1
  return Math.floor((y / height) * props.size) * props.size + Math.floor((x / width) * props.size)
}

function onPointerDown(event: PointerEvent): void {
  if (props.disabled || (event.pointerType === 'mouse' && event.button !== 0)) return
  downCell = cellAt(event)
  downId = event.pointerId
  if (downCell >= 0) cursor.value = downCell
}

function onPointerUp(event: PointerEvent): void {
  if (downId === null || event.pointerId !== downId) return
  const cell = cellAt(event)
  const start = downCell
  downId = null
  downCell = -1
  // Accept a slightly moved finger as long as it stays on the same arrow.
  if (cell >= 0 && start >= 0 && (cell === start || owners.value[cell] === owners.value[start])) {
    emit('tap', start)
  }
}

function onPointerCancel(): void {
  downId = null
  downCell = -1
}

// --- Keyboard --------------------------------------------------------------------

const cursor = ref(0)

function onKeydown(event: KeyboardEvent): void {
  if (props.disabled) return
  const n = props.size
  let row = Math.floor(cursor.value / n)
  let col = cursor.value % n
  switch (event.key) {
    case 'ArrowUp':
      row = Math.max(0, row - 1)
      break
    case 'ArrowDown':
      row = Math.min(n - 1, row + 1)
      break
    case 'ArrowLeft':
      col = Math.max(0, col - 1)
      break
    case 'ArrowRight':
      col = Math.min(n - 1, col + 1)
      break
    case 'Enter':
    case ' ':
      event.preventDefault()
      emit('tap', cursor.value)
      return
    default:
      return
  }
  event.preventDefault()
  cursor.value = row * n + col
}
</script>

<template>
  <div
    ref="board"
    class="arrows-board no-select"
    :class="{ 'arrows-board--disabled': disabled }"
    :style="{ '--n': size }"
    role="grid"
    :aria-label="t('arrows.play.board', { size })"
    tabindex="0"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
    @pointercancel="onPointerCancel"
    @keydown="onKeydown"
    @contextmenu.prevent
  >
    <div
      v-for="cell in total"
      :key="cell - 1"
      class="cell"
      :class="{ 'cell--cursor': cursor === cell - 1 }"
      role="gridcell"
      :data-cell="cell - 1"
      :aria-label="cellLabel(cell - 1)"
    />
    <svg class="overlay" :viewBox="`0 0 ${size} ${size}`" aria-hidden="true">
      <g class="ray">
        <circle v-for="dot in bumpPath" :key="dot.key" :cx="dot.x" :cy="dot.y" r="0.12" />
      </g>
      <g
        v-for="arrow in drawn"
        :key="arrow.leaveKey !== undefined ? `${arrow.id}-${arrow.leaveKey}` : arrow.id"
        class="arrow"
        :class="arrowClasses(arrow)"
        :style="arrowStyle(arrow)"
        :data-arrow="arrow.id"
      >
        <polyline
          v-if="highlight === arrow.id && arrow.leaveKey === undefined"
          class="arrow__glow"
          :points="arrow.points"
        />
        <polyline
          class="arrow__body"
          :points="arrow.leaveKey !== undefined ? arrow.exitPoints : arrow.points"
          :stroke="arrow.color"
        />
        <path class="arrow__head" :d="arrow.head" :fill="arrow.color" :stroke="arrow.color" />
      </g>
    </svg>
  </div>
</template>

<style scoped>
.arrows-board {
  --dot: color-mix(in srgb, var(--color-text) 18%, transparent);

  position: relative;
  display: grid;
  grid-template-columns: repeat(var(--n), minmax(0, 1fr));
  grid-template-rows: repeat(var(--n), minmax(0, 1fr));
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
  background-image: radial-gradient(circle, var(--dot) 1.5px, transparent 2px);
  background-size: calc(100% / var(--n)) calc(100% / var(--n));
  background-position: center;
  box-shadow: var(--shadow-md);
  touch-action: manipulation;
  outline: none;
  cursor: pointer;
}

.arrows-board--disabled {
  cursor: default;
}

.cell {
  min-width: 0;
  min-height: 0;
}

.arrows-board:focus-visible .cell--cursor {
  outline: 2px dashed var(--color-text);
  outline-offset: -3px;
}

.overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}

.arrow__body {
  fill: none;
  stroke-width: 0.3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.arrow__head {
  stroke-width: 0.06;
  stroke-linejoin: round;
}

.arrow__glow {
  fill: none;
  stroke: var(--color-accent);
  stroke-width: 0.62;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0.45;
  animation: glow 1.1s ease-in-out infinite;
}

.arrow--leaving .arrow__body {
  stroke-dasharray: var(--length) var(--gap);
  stroke-dashoffset: 0;
  animation: leave-body 420ms ease-in forwards;
}

.arrow--leaving .arrow__head {
  animation: leave-head 420ms ease-in forwards;
}

.arrow--bump {
  animation: bump 260ms ease-out;
}

.arrow--bump .arrow__body,
.arrow--blocker .arrow__body {
  animation: flash-stroke 700ms ease-out;
}

.arrow--bump .arrow__head,
.arrow--blocker .arrow__head {
  animation: flash-fill 700ms ease-out;
}

.ray circle {
  fill: var(--color-error);
  opacity: 0;
  animation: ray 900ms ease-out;
}

@keyframes leave-body {
  to {
    stroke-dashoffset: var(--travel);
  }
}

@keyframes leave-head {
  to {
    transform: translate(var(--dx), var(--dy));
  }
}

@keyframes bump {
  40% {
    transform: translate(var(--bx), var(--by));
  }
}

@keyframes flash-stroke {
  20%,
  60% {
    stroke: var(--color-error);
  }
}

@keyframes flash-fill {
  20%,
  60% {
    fill: var(--color-error);
    stroke: var(--color-error);
  }
}

@keyframes ray {
  15%,
  70% {
    opacity: 0.8;
  }
}

@keyframes glow {
  50% {
    opacity: 0.15;
  }
}

:root[data-motion='reduced'] .arrow--leaving {
  animation: fade 1ms forwards;
}

:root[data-motion='reduced'] .arrow--bump {
  animation: none;
}

:root[data-motion='reduced'] .arrow__glow {
  animation: none;
}

@keyframes fade {
  to {
    opacity: 0;
  }
}
</style>
