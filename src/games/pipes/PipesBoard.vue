<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId, watch } from 'vue'

import { t } from '@/core/i18n'
import { MIXED, rotate } from './logic/rules'
import { DIRECTIONS, DOWN, LEFT, RIGHT, UP } from './logic/types'

/** How long a press must be held to lock a tile (ms). */
const LONG_PRESS_MS = 350

const props = defineProps<{
  width: number
  height: number
  /** Source cells; with several, each feeds its own network in its own colour. */
  sources: readonly number[]
  /** Pipe ends per cell in the solution orientation. */
  solution: readonly number[]
  /** Clockwise quarter turns per cell. */
  turns: readonly number[]
  locked: ReadonlySet<number>
  /** Water per cell: source index, `DRY` (-1) or `MIXED` (-2), see `colors()`. */
  water: readonly number[]
  highlight?: number | null
  disabled?: boolean
  solved?: boolean
}>()

const emit = defineEmits<{
  rotate: [cell: number]
  lock: [cell: number]
}>()

const board = ref<HTMLElement | null>(null)
/** Prefix for cell ids (the focused grid points screen readers to the cursor cell). */
const idPrefix = useId()
const total = computed(() => props.width * props.height)

/**
 * Displayed angle per cell. It only grows (or shrinks by one step for undo), so a turn from
 * 270° to 0° spins forwards instead of all the way back.
 */
const angles = ref<number[]>(props.turns.map((turn) => turn * 90))
watch(
  () => [...props.turns],
  (next, prev) => {
    if (next.length !== angles.value.length) {
      angles.value = next.map((turn) => turn * 90)
      return
    }
    angles.value = angles.value.map((angle, cell) => {
      const delta = ((next[cell]! - (prev?.[cell] ?? 0)) % 4 + 4) % 4
      return angle + (delta === 3 ? -90 : delta * 90)
    })
  },
)

const END: Record<number, string> = { [UP]: 'M0.5 0.5V0', [RIGHT]: 'M0.5 0.5H1', [DOWN]: 'M0.5 0.5V1', [LEFT]: 'M0.5 0.5H0' }
const DIRECTION_KEYS: Record<number, 'up' | 'right' | 'down' | 'left'> = { [UP]: 'up', [RIGHT]: 'right', [DOWN]: 'down', [LEFT]: 'left' }

const tiles = computed(() =>
  Array.from({ length: total.value }, (_, cell) => {
    const mask = props.solution[cell]!
    const ends = DIRECTIONS.filter((dir) => mask & dir)
    const current = rotate(mask, props.turns[cell] ?? 0)
    const parts = [
      t('pipes.play.cell', { row: Math.floor(cell / props.width) + 1, col: (cell % props.width) + 1 }),
      t('pipes.play.directions', {
        list: DIRECTIONS.filter((dir) => current & dir)
          .map((dir) => t(`pipes.directions.${DIRECTION_KEYS[dir]!}`))
          .join(', '),
      }),
    ]
    const source = props.sources.indexOf(cell)
    const water = props.water[cell] ?? -1
    const several = props.sources.length > 1
    if (source >= 0) parts.push(several ? t('pipes.play.sourceN', { n: source + 1 }) : t('pipes.play.source'))
    if (water === MIXED) parts.push(t('pipes.play.mixed'))
    else if (water >= 0) parts.push(several ? t('pipes.play.waterN', { n: water + 1 }) : t('pipes.play.water'))
    if (props.locked.has(cell)) parts.push(t('pipes.play.locked'))
    return {
      cell,
      x: cell % props.width,
      y: Math.floor(cell / props.width),
      path: ends.map((dir) => END[dir]).join(''),
      single: ends.length === 1,
      source,
      water,
      number: several && source >= 0 ? String(source + 1) : '',
      label: parts.join(', '),
    }
  }),
)

// --- Pointer input: tap rotates, long press / right click locks --------------------

let downCell = -1
let downId: number | null = null
let pressTimer: ReturnType<typeof setTimeout> | undefined
let consumed = false
const pressing = ref(-1)

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
  return Math.floor((y / height) * props.height) * props.width + Math.floor((x / width) * props.width)
}

function cancelPress(): void {
  clearTimeout(pressTimer)
  pressTimer = undefined
  pressing.value = -1
}

function onPointerDown(event: PointerEvent): void {
  if (props.disabled) return
  const cell = cellAt(event)
  if (cell < 0) return
  cursor.value = cell
  if (event.pointerType === 'mouse' && event.button === 2) {
    emit('lock', cell)
    return
  }
  if (event.pointerType === 'mouse' && event.button !== 0) return
  downCell = cell
  downId = event.pointerId
  consumed = false
  cancelPress()
  pressing.value = cell
  pressTimer = setTimeout(() => {
    pressTimer = undefined
    pressing.value = -1
    consumed = true
    emit('lock', cell)
  }, LONG_PRESS_MS)
}

function onPointerMove(event: PointerEvent): void {
  if (downId === null || event.pointerId !== downId) return
  if (cellAt(event) !== downCell) {
    cancelPress()
    consumed = true
  }
}

function onPointerUp(event: PointerEvent): void {
  if (downId === null || event.pointerId !== downId) return
  const cell = cellAt(event)
  const start = downCell
  downId = null
  downCell = -1
  cancelPress()
  if (!consumed && cell === start && cell >= 0) emit('rotate', cell)
}

function onPointerCancel(): void {
  downId = null
  downCell = -1
  cancelPress()
}

onBeforeUnmount(cancelPress)

// --- Keyboard --------------------------------------------------------------------

const cursor = ref(-1)

function onKeydown(event: KeyboardEvent): void {
  if (props.disabled || event.ctrlKey || event.metaKey || event.altKey) return
  if (cursor.value < 0) cursor.value = 0
  let row = Math.floor(cursor.value / props.width)
  let col = cursor.value % props.width
  switch (event.key) {
    case 'ArrowUp':
      row = Math.max(0, row - 1)
      break
    case 'ArrowDown':
      row = Math.min(props.height - 1, row + 1)
      break
    case 'ArrowLeft':
      col = Math.max(0, col - 1)
      break
    case 'ArrowRight':
      col = Math.min(props.width - 1, col + 1)
      break
    case 'Enter':
    case ' ':
      event.preventDefault()
      emit('rotate', cursor.value)
      return
    case 'l':
    case 'L':
      event.preventDefault()
      emit('lock', cursor.value)
      return
    default:
      return
  }
  event.preventDefault()
  cursor.value = row * props.width + col
}
</script>

<template>
  <div
    ref="board"
    class="pipes-board no-select"
    :class="{ 'pipes-board--disabled': disabled, 'pipes-board--solved': solved }"
    :style="{ '--w': width, '--h': height }"
    role="grid"
    :aria-activedescendant="cursor >= 0 ? `${idPrefix}-${cursor}` : undefined"
    :aria-label="t('pipes.play.board', { width, height })"
    tabindex="0"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerCancel"
    @keydown="onKeydown"
    @focus="cursor < 0 && (cursor = 0)"
    @contextmenu.prevent
  >
    <div v-for="r in height" :key="r" class="row" role="row">
      <div
        v-for="tile in tiles.slice((r - 1) * width, r * width)"
        :id="`${idPrefix}-${tile.cell}`"
        :key="tile.cell"
        class="cell"
        :class="{
          'cell--locked': locked.has(tile.cell),
          'cell--cursor': cursor === tile.cell,
          'cell--pressing': pressing === tile.cell,
          'cell--hint': highlight === tile.cell,
        }"
        role="gridcell"
        :data-cell="tile.cell"
        :aria-label="tile.label"
      >
        <svg class="tile" viewBox="0 0 1 1" aria-hidden="true">
          <g
            class="tile__pipe"
            :class="[
              tile.water >= 0 && `tile__pipe--water tile__pipe--c${tile.water}`,
              tile.water === MIXED && 'tile__pipe--water tile__pipe--mixed',
              tile.source >= 0 && `tile__pipe--s${tile.source}`,
            ]"
            :style="{ transform: `rotate(${angles[tile.cell] ?? 0}deg)` }"
          >
            <path class="tile__casing" :d="tile.path" />
            <path class="tile__line" :d="tile.path" />
            <path v-if="tile.water >= 0" class="tile__flow" :d="tile.path" />
            <circle v-if="tile.source >= 0" class="tile__source" cx="0.5" cy="0.5" r="0.27" />
            <circle v-else-if="tile.single" class="tile__end" cx="0.5" cy="0.5" r="0.17" />
          </g>
          <text v-if="tile.number" class="tile__number" x="0.5" y="0.5">{{ tile.number }}</text>
        </svg>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pipes-board {
  /* ≥ 3:1 against normal and locked tiles (WCAG 1.4.11). */
  --pipe-empty: color-mix(in srgb, var(--color-text) 60%, var(--color-surface));
  --pipe-casing: color-mix(in srgb, var(--color-text) 14%, var(--color-surface));

  display: grid;
  grid-template-columns: repeat(var(--w), minmax(0, 1fr));
  grid-template-rows: repeat(var(--h), minmax(0, 1fr));
  gap: 2px;
  width: 100%;
  aspect-ratio: var(--w) / var(--h);
  padding: 2px;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface-2);
  box-shadow: var(--shadow-md);
  touch-action: manipulation;
  outline: none;
  cursor: pointer;
}

.row {
  display: contents;
}

.pipes-board--disabled {
  cursor: default;
}

.cell {
  position: relative;
  min-width: 0;
  min-height: 0;
  border-radius: 4px;
  background: var(--color-surface);
}

.cell--locked {
  background: var(--color-surface-3);
}

.cell--locked::after {
  content: '';
  position: absolute;
  top: 3px;
  right: 3px;
  width: 18%;
  height: 18%;
  border-top: 2px solid var(--color-text-muted);
  border-right: 2px solid var(--color-text-muted);
  border-top-right-radius: 3px;
}

.tile {
  display: block;
  width: 100%;
  height: 100%;
}

.tile__pipe {
  transform-box: view-box;
  transform-origin: 0.5px 0.5px;
  transition: transform var(--dur-fast) var(--ease-out);
}

.tile__casing {
  fill: none;
  stroke: var(--pipe-casing);
  stroke-width: 0.36;
  stroke-linecap: round;
}

.tile__line {
  fill: none;
  stroke: var(--pipe-empty);
  stroke-width: 0.22;
  stroke-linecap: round;
  transition: stroke var(--dur-med);
}

/* Water is not shown by colour alone (WCAG 1.4.1): filled pipes get a light core line. */
.tile__flow {
  fill: none;
  stroke: var(--color-surface);
  stroke-width: 0.06;
  stroke-linecap: round;
}

.tile__end {
  fill: var(--color-surface);
  stroke: var(--pipe-empty);
  stroke-width: 0.08;
}

.tile__source {
  fill: var(--source);
  stroke: var(--pipe-casing);
  stroke-width: 0.06;
}

.tile__number {
  fill: var(--color-surface);
  font-size: 0.32px;
  font-weight: 800;
  text-anchor: middle;
  dominant-baseline: central;
  pointer-events: none;
}

/* One colour per source; the first is the game colour (single-source boards look as before). */
.tile__pipe {
  --source: var(--game-pipes);
  --water: var(--game-pipes);
}

.tile__pipe--s1 {
  --source: var(--pipes-source-2);
}

.tile__pipe--s2 {
  --source: var(--pipes-source-3);
}

.tile__pipe--c1 {
  --water: var(--pipes-source-2);
}

.tile__pipe--c2 {
  --water: var(--pipes-source-3);
}

.tile__pipe--mixed {
  --water: var(--color-error);
}

.tile__pipe--water .tile__line {
  stroke: var(--water);
}

.tile__pipe--water .tile__end {
  fill: var(--water);
  stroke: var(--water);
}

/* Not by colour alone (WCAG 1.4.1): the core line differs per source; mixed water has none. */
.tile__pipe--c1 .tile__flow {
  stroke-dasharray: 0.12 0.08;
  stroke-linecap: butt;
}

.tile__pipe--c2 .tile__flow {
  stroke-width: 0.08;
  stroke-dasharray: 0 0.14;
}

.cell--pressing::after {
  content: '';
  position: absolute;
  inset: 10%;
  border: 2px solid var(--color-accent);
  border-radius: 50%;
  animation: press 350ms linear forwards;
}

.cell--hint {
  box-shadow: inset 0 0 0 3px var(--color-accent);
}

.pipes-board:focus-visible .cell--cursor {
  outline: 2px dashed var(--color-text);
  outline-offset: -2px;
}

.pipes-board--solved .cell {
  animation: solved 700ms ease-out;
}

@keyframes press {
  from {
    transform: scale(0.3);
    opacity: 0.2;
  }

  to {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes solved {
  50% {
    background: color-mix(in srgb, var(--game-pipes) 16%, var(--color-surface));
  }
}

:root[data-motion='reduced'] .tile__pipe,
:root[data-motion='reduced'] .tile__line {
  transition: none;
}

:root[data-motion='reduced'] .cell,
:root[data-motion='reduced'] .cell--pressing::after {
  animation: none;
}
</style>
