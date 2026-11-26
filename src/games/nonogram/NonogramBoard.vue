<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { t } from '@/core/i18n'
import { createTouchGuard } from '@/core/touchGuard'
import type { LineRef } from './logic/lines'
import { CROSSED, FILLED, type CellMark } from './logic/types'

const props = defineProps<{
  width: number
  height: number
  rowClues: readonly (readonly number[])[]
  colClues: readonly (readonly number[])[]
  cells: readonly CellMark[]
  /** Cells shown as mistakes. */
  wrong?: ReadonlySet<number> | null
  /** Rows / columns whose clue is satisfied (shown muted). */
  rowsDone: readonly boolean[]
  colsDone: readonly boolean[]
  /** Hint highlight: a line and the cells it concerns. */
  hintLine?: LineRef | null
  hintCells?: ReadonlySet<number> | null
  /** Row/column tint around this cell. */
  focusCell?: number | null
  disabled?: boolean
  solved?: boolean
}>()

const emit = defineEmits<{
  start: [cell: number]
  move: [cell: number]
  end: []
}>()

const wrap = ref<HTMLElement | null>(null)
const board = ref<HTMLElement | null>(null)
const total = computed(() => props.width * props.height)

// --- Sizing: fit grid + clues into the available area --------------------------------------

const area = ref({ width: 336, height: 420 })

const maxRowClueChars = computed(() =>
  Math.max(1, ...props.rowClues.map((clue) => (clue.length ? clue.join(' ').length : 1))),
)
const maxColClueCount = computed(() => Math.max(1, ...props.colClues.map((clue) => Math.max(1, clue.length))))

/** Cell size, clue font size and clue extents in px. */
const layout = computed(() => {
  let cell = 32
  let font = 12
  let rowClueW = 0
  let colClueH = 0
  for (let i = 0; i < 3; i++) {
    font = Math.max(9, Math.min(15, cell * 0.58))
    rowClueW = Math.ceil(maxRowClueChars.value * font * 0.62 + 8)
    colClueH = Math.ceil(maxColClueCount.value * font * 1.12 + 6)
    cell = Math.floor(
      Math.min(
        (area.value.width - rowClueW - 6) / props.width,
        (area.value.height - colClueH - 6) / props.height,
        56,
      ),
    )
    cell = Math.max(cell, 12)
  }
  return { cell, font, rowClueW, colClueH }
})

let observer: ResizeObserver | null = null

function measure(): void {
  const el = wrap.value
  if (!el) return
  const width = el.clientWidth
  const height = el.clientHeight
  if (width > 0 && height > 0) area.value = { width, height }
}

onMounted(() => {
  measure()
  if (typeof ResizeObserver !== 'undefined' && wrap.value) {
    observer = new ResizeObserver(measure)
    observer.observe(wrap.value)
  }
})

onBeforeUnmount(() => observer?.disconnect())

// --- Appearance ---------------------------------------------------------------------------

const focusRow = computed(() =>
  props.focusCell === null || props.focusCell === undefined ? -1 : Math.floor(props.focusCell / props.width),
)
const focusCol = computed(() =>
  props.focusCell === null || props.focusCell === undefined ? -1 : props.focusCell % props.width,
)

function cellClasses(cell: number): Record<string, boolean> {
  const r = Math.floor(cell / props.width)
  const c = cell % props.width
  const mark = props.cells[cell]
  return {
    'cell--filled': mark === FILLED,
    'cell--crossed': mark === CROSSED,
    'cell--wrong': props.wrong?.has(cell) ?? false,
    'cell--hint': props.hintCells?.has(cell) ?? false,
    'cell--focus-line': r === focusRow.value || c === focusCol.value,
    'cell--guide-right': (c + 1) % 5 === 0 && c < props.width - 1,
    'cell--guide-bottom': (r + 1) % 5 === 0 && r < props.height - 1,
    'cell--cursor': cursor.value === cell,
  }
}

const hintRow = computed(() => (props.hintLine?.kind === 'row' ? props.hintLine.index : -1))
const hintCol = computed(() => (props.hintLine?.kind === 'col' ? props.hintLine.index : -1))

// --- Pointer input ------------------------------------------------------------------------

let pointerId: number | null = null
let lastCell = -1

/** Cell under the pointer: browser hit testing, geometric fallback without the border. */
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

/** A second finger (pinch to zoom) cancels the gesture: only one finger plays. */
const touches = createTouchGuard()

function onPointerDown(event: PointerEvent): void {
  if (!touches.down(event)) {
    // A second finger: end the stroke the first one is painting.
    if (pointerId !== null) {
      pointerId = null
      lastCell = -1
      emit('end')
    }
    return
  }
  if (props.disabled || (event.pointerType === 'mouse' && event.button !== 0)) return
  const cell = cellAt(event)
  if (cell < 0) return
  try {
    board.value?.setPointerCapture(event.pointerId)
  } catch {
    // Not supported (e.g. synthetic events) – painting still works inside the board.
  }
  pointerId = event.pointerId
  lastCell = cell
  cursor.value = cell
  emit('start', cell)
}

function onPointerMove(event: PointerEvent): void {
  if (pointerId === null || event.pointerId !== pointerId) return
  const cell = cellAt(event)
  if (cell < 0 || cell === lastCell) return
  lastCell = cell
  emit('move', cell)
}

function finish(event: PointerEvent): void {
  touches.up(event)
  if (pointerId === null || event.pointerId !== pointerId) return
  pointerId = null
  lastCell = -1
  emit('end')
}

// --- Keyboard -----------------------------------------------------------------------------

const cursor = ref<number | null>(null)

function onKeydown(event: KeyboardEvent): void {
  if (props.disabled) return
  const current = cursor.value ?? 0
  let r = Math.floor(current / props.width)
  let c = current % props.width
  switch (event.key) {
    case 'ArrowUp':
      r = Math.max(0, r - 1)
      break
    case 'ArrowDown':
      r = Math.min(props.height - 1, r + 1)
      break
    case 'ArrowLeft':
      c = Math.max(0, c - 1)
      break
    case 'ArrowRight':
      c = Math.min(props.width - 1, c + 1)
      break
    case ' ':
    case 'Enter':
      event.preventDefault()
      cursor.value = current
      emit('start', current)
      emit('end')
      return
    default:
      return
  }
  event.preventDefault()
  cursor.value = r * props.width + c
}
</script>

<template>
  <div ref="wrap" class="nonogram-wrap">
    <div
      class="nonogram"
      :class="{ 'nonogram--solved': solved }"
      :style="{
        '--w': width,
        '--h': height,
        '--cell': `${layout.cell}px`,
        '--clue-font': `${layout.font}px`,
        '--row-clue-w': `${layout.rowClueW}px`,
        '--col-clue-h': `${layout.colClueH}px`,
      }"
    >
      <div class="corner" aria-hidden="true" />

      <div class="col-clues" aria-hidden="true">
        <div
          v-for="(clue, c) in colClues"
          :key="c"
          class="col-clue"
          :class="{
            'clue--done': colsDone[c],
            'clue--focus': c === focusCol,
            'clue--hint': c === hintCol,
          }"
        >
          <span v-for="(n, i) in clue.length ? clue : [0]" :key="i">{{ n }}</span>
        </div>
      </div>

      <div class="row-clues" aria-hidden="true">
        <div
          v-for="(clue, r) in rowClues"
          :key="r"
          class="row-clue"
          :class="{
            'clue--done': rowsDone[r],
            'clue--focus': r === focusRow,
            'clue--hint': r === hintRow,
          }"
        >
          <span v-for="(n, i) in clue.length ? clue : [0]" :key="i">{{ n }}</span>
        </div>
      </div>

      <div
        ref="board"
        class="board no-select"
        :class="{ 'board--disabled': disabled }"
        role="grid"
        tabindex="0"
        :aria-label="t('nonogram.play.board', { width, height })"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="finish"
        @pointercancel="finish"
        @lostpointercapture="finish"
        @keydown="onKeydown"
        @contextmenu.prevent
      >
        <div
          v-for="cell in total"
          :key="cell - 1"
          class="cell"
          role="gridcell"
          :data-cell="cell - 1"
          :class="cellClasses(cell - 1)"
        >
          <svg v-if="cells[cell - 1] === CROSSED" class="cell__cross" viewBox="0 0 10 10" aria-hidden="true">
            <path d="M2.5 2.5l5 5M7.5 2.5l-5 5" />
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.nonogram-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.nonogram {
  --grid-line: color-mix(in srgb, var(--color-border-strong) 18%, transparent);
  --guide-line: color-mix(in srgb, var(--color-border-strong) 55%, transparent);
  --fill: var(--game-nonogram);

  display: grid;
  grid-template-columns: var(--row-clue-w) calc(var(--cell) * var(--w) + 6px);
  grid-template-rows: var(--col-clue-h) calc(var(--cell) * var(--h) + 6px);
  font-size: var(--clue-font);
  font-variant-numeric: tabular-nums;
}

.col-clues {
  display: grid;
  grid-template-columns: repeat(var(--w), var(--cell));
  padding: 0 3px;
}

.col-clue {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  padding-bottom: 3px;
  line-height: 1.12;
  font-weight: 700;
  border-radius: 4px 4px 0 0;
}

.row-clues {
  display: grid;
  grid-template-rows: repeat(var(--h), var(--cell));
  padding: 3px 0;
}

.row-clue {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.38em;
  padding-right: 5px;
  font-weight: 700;
  white-space: nowrap;
  border-radius: 4px 0 0 4px;
}

.clue--done {
  color: var(--color-text-muted);
  opacity: 0.45;
  font-weight: 500;
}

.clue--focus {
  background: color-mix(in srgb, var(--fill) 12%, transparent);
}

.clue--hint {
  background: color-mix(in srgb, var(--color-accent) 22%, transparent);
  color: var(--color-text);
  opacity: 1;
}

.board {
  display: grid;
  /* Equal tracks whatever a cell contains. */
  grid-template-columns: repeat(var(--w), minmax(0, 1fr));
  grid-template-rows: repeat(var(--h), minmax(0, 1fr));
  border: 3px solid var(--color-border-strong);
  border-radius: 6px;
  background: var(--color-surface);
  /* Two-finger zoom stays possible (low vision); one finger never scrolls the page. */
  touch-action: pinch-zoom;
  outline: none;
  cursor: pointer;
  overflow: hidden;
}

.board--disabled {
  cursor: default;
}

.cell {
  position: relative;
  min-width: 0;
  min-height: 0;
  border-right: 1px solid var(--grid-line);
  border-bottom: 1px solid var(--grid-line);
  transition: background-color var(--dur-fast);
}

.cell--guide-right {
  border-right: 2px solid var(--guide-line);
}

.cell--guide-bottom {
  border-bottom: 2px solid var(--guide-line);
}

.cell--focus-line {
  background: color-mix(in srgb, var(--fill) 8%, transparent);
}

.cell--filled {
  background: var(--fill);
}

.cell--filled::after {
  content: '';
  position: absolute;
  inset: 0;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, #000 12%, transparent);
  pointer-events: none;
}

.cell__cross {
  position: absolute;
  inset: 0;
  margin: auto;
  width: 70%;
  height: 70%;
  fill: none;
  stroke: var(--color-text-muted);
  stroke-width: 1.3;
  stroke-linecap: round;
  pointer-events: none;
}

/* Wrong fills: error colour plus stripes, so they do not rely on hue alone. */
.cell--wrong.cell--filled {
  background: repeating-linear-gradient(
    135deg,
    var(--color-error) 0 3px,
    color-mix(in srgb, var(--color-error) 45%, var(--color-surface)) 3px 6px
  );
}

.cell--wrong .cell__cross {
  stroke: var(--color-error);
  stroke-width: 1.8;
}

.cell--hint {
  box-shadow: inset 0 0 0 2px var(--color-accent);
}

.board:focus-visible .cell--cursor {
  box-shadow: inset 0 0 0 2px var(--color-text);
}

.nonogram--solved .cell__cross {
  opacity: 0;
  transition: opacity var(--dur-slow);
}

.nonogram--solved .cell {
  border-color: transparent;
}
</style>
