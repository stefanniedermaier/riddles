<script setup lang="ts">
import { computed, ref } from 'vue'

import { t } from '@/core/i18n'
import { resolvedTheme } from '@/core/theme'
import type { Endpoint } from './logic/types'
import { colorLabel, lineColor } from './palette'

const props = defineProps<{
  size: number
  endpoints: readonly Endpoint[]
  /** Current line per colour. */
  paths: readonly (readonly number[])[]
  /** Colours whose line connects both dots. */
  connected: readonly boolean[]
  showLabels?: boolean
  /** Colour to pulse briefly (just connected or revealed by a hint). */
  flash?: number | null
  disabled?: boolean
}>()

const emit = defineEmits<{
  start: [cell: number]
  move: [cell: number]
  end: []
}>()

const board = ref<HTMLElement | null>(null)
const total = computed(() => props.size * props.size)

const colorOf = (color: number) => lineColor(resolvedTheme.value, color)

/** Colour covering each cell (for the tint), -1 if none. */
const owners = computed(() => {
  const owners = new Array<number>(total.value).fill(-1)
  props.paths.forEach((path, color) => path.forEach((cell) => (owners[cell] = color)))
  return owners
})

function cellStyle(cell: number): Record<string, string> | undefined {
  const owner = owners.value[cell]!
  if (owner < 0) return undefined
  return { background: `color-mix(in srgb, ${colorOf(owner)} 24%, var(--links-cell))` }
}

const center = (cell: number) => ({ x: (cell % props.size) + 0.5, y: Math.floor(cell / props.size) + 0.5 })

const lines = computed(() =>
  props.paths
    .map((path, color) => ({
      color,
      points: path.map((cell) => `${center(cell).x},${center(cell).y}`).join(' '),
      length: path.length,
    }))
    .filter((line) => line.length >= 2),
)

const dots = computed(() =>
  props.endpoints.flatMap((e) => [
    { key: `${e.color}a`, color: e.color, ...center(e.a) },
    { key: `${e.color}b`, color: e.color, ...center(e.b) },
  ]),
)

// --- Pointer input ------------------------------------------------------------------

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
  return Math.floor((y / height) * props.size) * props.size + Math.floor((x / width) * props.size)
}

function onPointerDown(event: PointerEvent): void {
  if (props.disabled || (event.pointerType === 'mouse' && event.button !== 0)) return
  const cell = cellAt(event)
  if (cell < 0) return
  try {
    board.value?.setPointerCapture(event.pointerId)
  } catch {
    // Not supported (e.g. synthetic events) – drawing still works inside the board.
  }
  pointerId = event.pointerId
  lastCell = cell
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
  if (pointerId === null || event.pointerId !== pointerId) return
  pointerId = null
  lastCell = -1
  emit('end')
}
</script>

<template>
  <div
    ref="board"
    class="links-board no-select"
    :class="{ 'links-board--disabled': disabled }"
    :style="{ '--n': size }"
    role="grid"
    :aria-label="t('links.play.board', { size })"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="finish"
    @pointercancel="finish"
    @lostpointercapture="finish"
    @contextmenu.prevent
  >
    <div
      v-for="cell in total"
      :key="cell - 1"
      class="cell"
      role="gridcell"
      :data-cell="cell - 1"
      :style="cellStyle(cell - 1)"
    />

    <svg class="overlay" :viewBox="`0 0 ${size} ${size}`" aria-hidden="true">
      <polyline
        v-for="line in lines"
        :key="line.color"
        class="line"
        :class="{ 'line--done': connected[line.color], 'line--flash': flash === line.color }"
        :points="line.points"
        :stroke="colorOf(line.color)"
      />
      <g v-for="dot in dots" :key="dot.key" :class="{ 'dot--flash': flash === dot.color }">
        <circle class="dot" :cx="dot.x" :cy="dot.y" r="0.34" :fill="colorOf(dot.color)" />
        <text
          v-if="showLabels"
          class="dot__label"
          :x="dot.x"
          :y="dot.y"
          text-anchor="middle"
          dominant-baseline="central"
        >
          {{ colorLabel(dot.color) }}
        </text>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.links-board {
  --links-cell: var(--color-surface);
  --links-grid: color-mix(in srgb, var(--color-border-strong) 16%, transparent);

  position: relative;
  display: grid;
  /* Equal tracks whatever a cell contains; decorations live in the overlay. */
  grid-template-columns: repeat(var(--n), minmax(0, 1fr));
  grid-template-rows: repeat(var(--n), minmax(0, 1fr));
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  border: 3px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  background: var(--links-cell);
  box-shadow: var(--shadow-md);
  touch-action: none;
  cursor: pointer;
}

:root[data-theme='dark'] .links-board {
  --links-cell: var(--color-surface-2);
}

.links-board--disabled {
  cursor: default;
}

.cell {
  min-width: 0;
  min-height: 0;
  border-right: 1px solid var(--links-grid);
  border-bottom: 1px solid var(--links-grid);
  transition: background-color var(--dur-fast);
}

.overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}

.line {
  fill: none;
  stroke-width: 0.3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.line--done {
  stroke-width: 0.36;
}

.line--flash,
.dot--flash {
  animation: link-flash 0.7s var(--ease-out);
}

.dot__label {
  fill: #fff;
  font-family: var(--font-sans);
  font-size: 0.36px;
  font-weight: 800;
  pointer-events: none;
}

:root[data-theme='dark'] .dot__label {
  fill: #15141b;
}

:root[data-motion='reduced'] .line--flash,
:root[data-motion='reduced'] .dot--flash {
  animation: none;
}

@keyframes link-flash {
  40% {
    opacity: 0.45;
  }
}
</style>
