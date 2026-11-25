<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId } from 'vue'

import { t } from '@/core/i18n'
import { resolvedTheme } from '@/core/theme'
import { FLAGGED, REVEALED, type CellState } from './logic/types'
import { numberColor } from './palette'

/** How long a press must be held for the other action (ms). */
const LONG_PRESS_MS = 350

const props = defineProps<{
  width: number
  height: number
  cells: readonly CellState[]
  /** Adjacent mine count per cell. */
  counts: ArrayLike<number>
  /** Mines to show (after a mine hit), otherwise null. */
  mines?: ReadonlySet<number> | null
  /** The mine that was hit. */
  hit?: number | null
  /** Flags shown as wrong. */
  wrong?: ReadonlySet<number> | null
  /** Numbers a hint is based on. */
  hintSources?: ReadonlySet<number> | null
  /** Cells a hint proves safe / proves to be mines. */
  hintSafe?: ReadonlySet<number> | null
  hintMines?: ReadonlySet<number> | null
  /** Long press triggers `alt`. */
  longPress?: boolean
  disabled?: boolean
  solved?: boolean
}>()

const emit = defineEmits<{
  /** Short tap (the selected tool's action). */
  tap: [cell: number]
  /** Long press or right click (the other action). */
  alt: [cell: number]
  /** Keyboard "F": flag explicitly. */
  flag: [cell: number]
}>()

const board = ref<HTMLElement | null>(null)
/** Prefix for cell ids (the focused grid points screen readers to the cursor cell). */
const idPrefix = useId()
/** Gradient ids for the flag and mine artwork (unique per board). */
const grad = {
  cloth: `${idPrefix}-cloth`,
  pole: `${idPrefix}-pole`,
  bomb: `${idPrefix}-bomb`,
}
const total = computed(() => props.width * props.height)

interface CellView {
  cell: number
  number: number
  classes: Record<string, boolean>
  color: string | undefined
  label: string
  icon: 'flag' | 'mine' | null
}

const view = computed<CellView[]>(() => {
  const theme = resolvedTheme.value
  const result: CellView[] = []
  for (let cell = 0; cell < total.value; cell++) {
    const state = props.cells[cell]
    const revealed = state === REVEALED
    const isShownMine = props.mines?.has(cell) ?? false
    const mineVisible = (revealed && cell === props.hit) || (isShownMine && state !== FLAGGED)
    const number = revealed && !mineVisible ? props.counts[cell]! : 0
    const wrong = state === FLAGGED && (props.wrong?.has(cell) ?? false)
    const position = t('mines.play.cell', { row: Math.floor(cell / props.width) + 1, col: (cell % props.width) + 1 })
    let what: string
    if (mineVisible) what = t('mines.play.mine')
    else if (state === FLAGGED) what = wrong ? t('mines.play.wrongFlag') : t('mines.play.flagged')
    else if (revealed) what = number ? t('mines.play.number', { count: number }) : t('mines.play.empty')
    else what = t('mines.play.covered')
    if (props.hintSafe?.has(cell)) what += `, ${t('mines.play.hintSafe')}`
    if (props.hintMines?.has(cell)) what += `, ${t('mines.play.hintMine')}`
    result.push({
      cell,
      number,
      color: number ? numberColor(theme, number) : undefined,
      icon: mineVisible ? 'mine' : state === FLAGGED ? 'flag' : null,
      label: `${position}, ${what}`,
      classes: {
        'cell--open': revealed || mineVisible,
        'cell--hit': cell === props.hit,
        'cell--wrong': wrong,
        'cell--cursor': cursor.value === cell,
        'cell--pressing': pressing.value === cell,
        'cell--source': props.hintSources?.has(cell) ?? false,
        'cell--safe': props.hintSafe?.has(cell) ?? false,
        'cell--danger': props.hintMines?.has(cell) ?? false,
      },
    })
  }
  return result
})

// --- Pointer input: tap, long press, right click -----------------------------------

let downCell = -1
let downId: number | null = null
let pressTimer: ReturnType<typeof setTimeout> | undefined
/** The long press already fired – the release must not tap as well. */
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
    emit('alt', cell)
    return
  }
  if (event.pointerType === 'mouse' && event.button !== 0) return
  downCell = cell
  downId = event.pointerId
  consumed = false
  cancelPress()
  if (props.longPress && props.cells[cell] !== REVEALED) {
    pressing.value = cell
    pressTimer = setTimeout(() => {
      pressTimer = undefined
      pressing.value = -1
      consumed = true
      emit('alt', cell)
    }, LONG_PRESS_MS)
  }
}

function onPointerMove(event: PointerEvent): void {
  if (downId === null || event.pointerId !== downId) return
  // Moving to another cell cancels the press (the player is probably scrolling or aiming).
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
  if (!consumed && cell === start && cell >= 0) emit('tap', cell)
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
      emit('tap', cursor.value)
      return
    case 'f':
    case 'F':
      event.preventDefault()
      emit('flag', cursor.value)
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
    class="mines-board no-select"
    :class="{ 'mines-board--disabled': disabled, 'mines-board--solved': solved }"
    :style="{ '--w': width, '--h': height }"
    role="grid"
    :aria-activedescendant="cursor >= 0 ? `${idPrefix}-${cursor}` : undefined"
    :aria-label="t('mines.play.board', { width, height })"
    tabindex="0"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerCancel"
    @keydown="onKeydown"
    @focus="cursor < 0 && (cursor = 0)"
    @contextmenu.prevent
  >
    <svg class="defs" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient :id="grad.cloth" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ff7a88" />
          <stop offset="0.5" stop-color="#f2263f" />
          <stop offset="1" stop-color="#b0101f" />
        </linearGradient>
        <linearGradient :id="grad.pole" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#c98a52" />
          <stop offset="1" stop-color="#7a4a1f" />
        </linearGradient>
        <radialGradient :id="grad.bomb" cx="0.36" cy="0.3" r="0.78">
          <stop offset="0" stop-color="#8d96ab" />
          <stop offset="0.5" stop-color="#2d3242" />
          <stop offset="1" stop-color="#0b0d14" />
        </radialGradient>
      </defs>
    </svg>
    <div v-for="r in height" :key="r" class="row" role="row">
      <div
        v-for="c in view.slice((r - 1) * width, r * width)"
        :id="`${idPrefix}-${c.cell}`"
        :key="c.cell"
        class="cell"
        :class="c.classes"
        role="gridcell"
        :data-cell="c.cell"
        :aria-label="c.label"
      >
        <span v-if="c.number" class="cell__number" :style="{ color: c.color }" aria-hidden="true">{{ c.number }}</span>
        <svg v-else-if="c.icon === 'flag'" class="cell__icon" viewBox="0 0 24 24" aria-hidden="true">
          <ellipse class="flag__mound" cx="9" cy="20.6" rx="6.2" ry="2.1" />
          <rect class="flag__pole" x="6.7" y="3" width="1.9" height="17.6" rx="0.95" :fill="`url(#${grad.pole})`" />
          <path
            class="flag__cloth"
            d="M8.5 3.9Q13 2.6 19 5.9Q14.6 7.7 19 11.4Q13.2 9.7 8.5 11.2Z"
            :fill="`url(#${grad.cloth})`"
          />
          <path class="flag__shine" d="M9.8 5.2Q12.4 4.5 15 5.6" />
          <circle class="flag__knob" cx="7.65" cy="3" r="1.4" />
          <path v-if="c.classes['cell--wrong']" class="flag__cross" d="M4 4l16 16M20 4L4 20" />
        </svg>
        <svg v-else-if="c.icon === 'mine'" class="cell__icon" viewBox="0 0 24 24" aria-hidden="true">
          <g class="mine__spikes">
            <path d="M12 2.6v4M12 17.4v4M2.6 12h4M17.4 12h4M5.4 5.4l2.8 2.8M15.8 15.8l2.8 2.8M18.6 5.4l-2.8 2.8M8.2 15.8l-2.8 2.8" />
          </g>
          <circle class="mine__body" cx="12" cy="12" r="6.6" :fill="`url(#${grad.bomb})`" />
          <ellipse class="mine__shine" cx="9.8" cy="9.4" rx="2.2" ry="1.4" transform="rotate(-35 9.8 9.4)" />
          <circle class="mine__light" cx="14.2" cy="14.2" r="1.3" />
        </svg>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mines-board {
  /*
   * Glossy meadow tiles over sand: covered cells keep ≥ 3:1 contrast to revealed cells
   * (WCAG 1.4.11) – mid green #3f8f33 vs. sand #f6efdc ≈ 3.5:1.
   */
  --covered: #3f8f33;
  --covered-top: #74c95f;
  --covered-bottom: #2f7428;
  --covered-hi: rgb(255 255 255 / 45%);
  --covered-lo: rgb(0 40 0 / 35%);
  --open: #f6efdc;
  --frame: #2f6b2a;
  --gap: 2px;

  container-type: inline-size;
  display: grid;
  grid-template-columns: repeat(var(--w), minmax(0, 1fr));
  grid-template-rows: repeat(var(--h), minmax(0, 1fr));
  gap: var(--gap);
  width: 100%;
  aspect-ratio: var(--w) / var(--h);
  padding: var(--gap);
  border: 3px solid var(--frame);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--frame) 70%, #000);
  box-shadow:
    inset 0 2px 4px rgb(0 0 0 / 35%),
    0 8px 18px rgb(20 40 10 / 30%);
  touch-action: manipulation;
  outline: none;
  cursor: pointer;
}

:root[data-theme='dark'] .mines-board {
  /* Mid green #4a9a3e vs. the dark sand ≈ 4:1. */
  --covered: #4a9a3e;
  --covered-top: #6cbf58;
  --covered-bottom: #3a7f30;
  --covered-hi: rgb(255 255 255 / 30%);
  --covered-lo: rgb(0 0 0 / 40%);
  --open: #23222e;
  --frame: #24461f;
}

.defs {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
}

.row {
  display: contents;
}

.mines-board--disabled {
  cursor: default;
}

.cell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  min-height: 0;
  border-radius: 4px;
  background: linear-gradient(180deg, var(--covered-top), var(--covered) 55%, var(--covered-bottom));
  box-shadow:
    inset 0 2px 0 var(--covered-hi),
    inset 0 -2px 0 var(--covered-lo);
  transition:
    background-color var(--dur-fast),
    box-shadow var(--dur-fast);
}

.cell--open {
  background: var(--open);
  box-shadow: inset 0 1px 2px rgb(60 40 0 / 18%);
}

.cell__number {
  font-size: calc(100cqw / var(--w) * 0.6);
  font-weight: 800;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.cell__icon {
  width: 94%;
  height: 94%;
  overflow: visible;
  filter: drop-shadow(0 1px 0 rgb(0 0 0 / 30%));
}

.flag__mound {
  fill: #6b4a2a;
  opacity: 0.85;
}

.flag__pole {
  stroke: #3a2410;
  stroke-width: 0.6;
}

.flag__cloth {
  stroke: #6e0614;
  stroke-width: 1;
  stroke-linejoin: round;
}

.flag__shine {
  fill: none;
  stroke: rgb(255 255 255 / 75%);
  stroke-width: 0.9;
  stroke-linecap: round;
}

.flag__knob {
  fill: var(--gold);
  stroke: #a86800;
  stroke-width: 0.6;
}

.flag__cross {
  fill: none;
  stroke: #1d1b26;
  stroke-width: 2.6;
  stroke-linecap: round;
}

.cell--wrong {
  background: var(--color-error-soft);
}

.mine__spikes {
  stroke: #23262f;
  stroke-width: 2.6;
  stroke-linecap: round;
}

.mine__body {
  stroke: #05060a;
  stroke-width: 0.8;
}

.mine__shine {
  fill: rgb(255 255 255 / 80%);
}

.mine__light {
  fill: #ff4d64;
  stroke: #7d0718;
  stroke-width: 0.5;
}

:root[data-theme='dark'] .mine__spikes {
  stroke: #c9cfdb;
}

.cell--hit {
  background: radial-gradient(circle, #ffd36b 0 18%, #ff5a1f 45%, #c0101f 80%);
  animation: hit 420ms ease-out;
}

.cell--hit .mine__spikes {
  stroke: #23262f;
}

.cell--pressing::after {
  content: '';
  position: absolute;
  inset: 8%;
  border: 2px solid var(--color-accent);
  border-radius: 50%;
  animation: press 350ms linear forwards;
}

.cell--source {
  outline: 2px solid var(--color-accent);
  outline-offset: -2px;
}

.cell--safe {
  /* White on the green tiles (green would vanish there). */
  box-shadow: inset 0 0 0 3px #fff;
  animation: glow 1.1s ease-in-out infinite;
}

.cell--danger {
  box-shadow: inset 0 0 0 3px #ff3b4f;
  animation: glow 1.1s ease-in-out infinite;
}

/* Not by colour alone (WCAG 1.4.1): a check mark for safe cells, "!" for mines. */
.cell--safe:not(.cell--open)::before,
.cell--danger:not(.cell--open)::before {
  position: absolute;
  font-size: calc(100cqw / var(--w) * 0.5);
  font-weight: 900;
  line-height: 1;
}

.cell--safe:not(.cell--open)::before {
  content: '✓';
  color: #fff;
  text-shadow: 0 1px 2px rgb(0 40 0 / 70%);
}

.cell--danger:not(.cell--open)::before {
  content: '!';
  color: #fff;
  text-shadow: 0 0 3px #b0101f, 0 1px 0 #7d0718;
}

.mines-board:focus-visible .cell--cursor {
  outline: 2px dashed var(--color-text);
  outline-offset: -2px;
}

.mines-board--solved .cell--open {
  animation: solved 600ms ease-out;
}

@keyframes hit {
  30% {
    transform: scale(1.25);
  }
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

@keyframes glow {
  50% {
    opacity: 0.55;
  }
}

@keyframes solved {
  50% {
    background: color-mix(in srgb, var(--game-mines) 18%, var(--open));
  }
}

:root[data-motion='reduced'] .cell {
  transition: none;
  animation: none;
}

:root[data-motion='reduced'] .cell--pressing::after {
  animation: none;
}
</style>
