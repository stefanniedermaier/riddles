<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'

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
    :aria-label="t('mines.play.board', { width, height })"
    tabindex="0"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerCancel"
    @keydown="onKeydown"
    @contextmenu.prevent
  >
    <div v-for="r in height" :key="r" class="row" role="row">
      <div
        v-for="c in view.slice((r - 1) * width, r * width)"
        :key="c.cell"
        class="cell"
        :class="c.classes"
        role="gridcell"
        :data-cell="c.cell"
        :aria-label="c.label"
      >
        <span v-if="c.number" class="cell__number" :style="{ color: c.color }" aria-hidden="true">{{ c.number }}</span>
        <svg v-else-if="c.icon === 'flag'" class="cell__icon" viewBox="0 0 24 24" aria-hidden="true">
          <path class="flag__pole" d="M7 3.5v17" />
          <path class="flag__cloth" d="M8 4.2l10 4.3-10 4.3z" />
          <path class="flag__base" d="M4.5 20.5h7" />
          <path v-if="c.classes['cell--wrong']" class="flag__cross" d="M4 4l16 16M20 4L4 20" />
        </svg>
        <svg v-else-if="c.icon === 'mine'" class="cell__icon" viewBox="0 0 24 24" aria-hidden="true">
          <g class="mine__spikes">
            <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4" />
          </g>
          <circle class="mine__body" cx="12" cy="12" r="6" />
          <circle class="mine__shine" cx="10" cy="10" r="1.6" />
        </svg>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mines-board {
  --covered: var(--color-surface-3);
  --covered-hi: color-mix(in srgb, var(--covered) 55%, #fff);
  --covered-lo: color-mix(in srgb, var(--covered) 80%, #000);
  --open: var(--color-surface);
  --gap: 2px;

  container-type: inline-size;
  display: grid;
  grid-template-columns: repeat(var(--w), minmax(0, 1fr));
  grid-template-rows: repeat(var(--h), minmax(0, 1fr));
  gap: var(--gap);
  width: 100%;
  aspect-ratio: var(--w) / var(--h);
  padding: var(--gap);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface-2);
  box-shadow: var(--shadow-md);
  touch-action: manipulation;
  outline: none;
  cursor: pointer;
}

:root[data-theme='dark'] .mines-board {
  --covered: #4a4659;
  --covered-hi: color-mix(in srgb, var(--covered) 75%, #fff);
  --covered-lo: color-mix(in srgb, var(--covered) 70%, #000);
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
  border-radius: 3px;
  background: var(--covered);
  box-shadow:
    inset 0 2px 0 var(--covered-hi),
    inset 0 -2px 0 var(--covered-lo);
  transition:
    background-color var(--dur-fast),
    box-shadow var(--dur-fast);
}

.cell--open {
  background: var(--open);
  box-shadow: none;
}

.cell__number {
  font-size: calc(100cqw / var(--w) * 0.6);
  font-weight: 800;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.cell__icon {
  width: 72%;
  height: 72%;
}

.flag__pole,
.flag__base {
  fill: none;
  stroke: var(--color-text);
  stroke-width: 2;
  stroke-linecap: round;
}

.flag__cloth {
  fill: var(--color-error);
  stroke: var(--color-error);
  stroke-width: 1.2;
  stroke-linejoin: round;
}

.flag__cross {
  fill: none;
  stroke: var(--color-text);
  stroke-width: 2.4;
  stroke-linecap: round;
}

.cell--wrong {
  background: var(--color-error-soft);
}

.mine__spikes {
  stroke: var(--color-text);
  stroke-width: 2.2;
  stroke-linecap: round;
}

.mine__body {
  fill: var(--color-text);
}

.mine__shine {
  fill: var(--color-surface);
}

.cell--hit {
  background: var(--color-error);
  animation: hit 420ms ease-out;
}

.cell--hit .mine__spikes {
  stroke: var(--color-on-accent);
}

.cell--hit .mine__body {
  fill: var(--color-on-accent);
}

.cell--hit .mine__shine {
  fill: var(--color-error);
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
  box-shadow: inset 0 0 0 3px var(--color-success);
  animation: glow 1.1s ease-in-out infinite;
}

.cell--danger {
  box-shadow: inset 0 0 0 3px var(--color-error);
  animation: glow 1.1s ease-in-out infinite;
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
