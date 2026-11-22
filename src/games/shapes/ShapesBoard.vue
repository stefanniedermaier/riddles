<script setup lang="ts">
import { computed, ref } from 'vue'

import { t } from '@/core/i18n'
import type { BoardEffect, DisplayPiece } from './animator'
import { CELLS, SIZE, areAdjacent, cellAt, type Field } from './logic/types'
import ObstacleArt from './ObstacleArt.vue'
import ShapePiece from './ShapePiece.vue'

const props = defineProps<{
  pieces: DisplayPiece[]
  /** Short visual effects (juice splashes, rocket beams, bomb waves). */
  effects: BoardEffect[]
  /** Selected cell (tap-tap input). */
  selected: number | null
  /** Two cells of a suggested move. */
  hint: [number, number] | null
  /** Ignore input (animations running, paused, finished). */
  locked: boolean
  /** Level obstacles (crates, target tiles, chains). */
  field?: Field | null
}>()

const emit = defineEmits<{
  swap: [from: number, to: number]
  select: [cell: number | null]
  /** Any pointer activity – resets the idle hint timer. */
  interact: []
}>()

const boardEl = ref<HTMLElement | null>(null)

interface Gesture {
  pointerId: number
  x: number
  y: number
  cell: number
}
let gesture: Gesture | null = null

function cellFromPoint(x: number, y: number): number | null {
  const rect = boardEl.value?.getBoundingClientRect()
  if (!rect || rect.width === 0) return null
  const col = Math.floor(((x - rect.left) / rect.width) * SIZE)
  const row = Math.floor(((y - rect.top) / rect.height) * SIZE)
  if (row < 0 || row >= SIZE || col < 0 || col >= SIZE) return null
  return cellAt(row, col)
}

function onPointerDown(event: PointerEvent): void {
  emit('interact')
  if (props.locked || !event.isPrimary) return
  const cell = cellFromPoint(event.clientX, event.clientY)
  if (cell === null) return
  gesture = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, cell }
  boardEl.value?.setPointerCapture?.(event.pointerId)
}

function onPointerMove(event: PointerEvent): void {
  if (!gesture || gesture.pointerId !== event.pointerId || props.locked) return
  const rect = boardEl.value?.getBoundingClientRect()
  const threshold = Math.max(12, ((rect?.width ?? 320) / SIZE) * 0.35)
  const dx = event.clientX - gesture.x
  const dy = event.clientY - gesture.y
  if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return

  const from = gesture.cell
  gesture = null
  const row = Math.floor(from / SIZE)
  const col = from % SIZE
  let to: number | null = null
  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > 0 && col < SIZE - 1) to = from + 1
    if (dx < 0 && col > 0) to = from - 1
  } else {
    if (dy > 0 && row < SIZE - 1) to = from + SIZE
    if (dy < 0 && row > 0) to = from - SIZE
  }
  emit('select', null)
  if (to !== null) emit('swap', from, to)
}

function onPointerUp(event: PointerEvent): void {
  if (!gesture || gesture.pointerId !== event.pointerId) return
  const cell = gesture.cell
  gesture = null
  if (props.locked) return
  // A tap: select, deselect, or swap with the selected neighbour.
  if (props.selected === null) emit('select', cell)
  else if (props.selected === cell) emit('select', null)
  else if (areAdjacent(props.selected, cell)) {
    const from = props.selected
    emit('select', null)
    emit('swap', from, cell)
  } else emit('select', cell)
}

function onPointerCancel(): void {
  gesture = null
}

const hintIds = computed(() => {
  if (!props.hint) return new Set<number>()
  const [a, b] = props.hint
  const cells = new Set([a, b])
  return new Set(
    props.pieces.filter((p) => cells.has(cellAt(p.row, p.col)) && !p.clearing).map((p) => p.id),
  )
})

/** Eight juice drops per splash, evenly spread with a little jitter. */
const DROPS = Array.from({ length: 8 }, (_, i) => ({
  angle: i * 45 + (i % 2 ? 12 : -8),
  distance: i % 2 ? 0.75 : 1,
}))

function effectStyle(effect: BoardEffect) {
  return {
    left: `${((effect.col + 0.5) / SIZE) * 100}%`,
    top: `${((effect.row + 0.5) / SIZE) * 100}%`,
    '--fx-color': `var(--fx-${effect.kind < 0 ? 'item' : effect.kind})`,
  }
}

const cellsWith = (values: number[] | undefined) =>
  values ? Array.from({ length: CELLS }, (_, cell) => cell).filter((cell) => values[cell]! > 0) : []

const targetCells = computed(() => cellsWith(props.field?.targets))
const crateCells = computed(() => cellsWith(props.field?.crates))
const chainCells = computed(() => cellsWith(props.field?.chains))

function cellStyle(cell: number) {
  return {
    left: `${(cell % SIZE) * 12.5}%`,
    top: `${Math.floor(cell / SIZE) * 12.5}%`,
  }
}

function isSelected(piece: DisplayPiece): boolean {
  return props.selected !== null && cellAt(piece.row, piece.col) === props.selected
}
</script>

<template>
  <div
    ref="boardEl"
    class="board no-select"
    role="application"
    :aria-label="t('shapes.board.label')"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerCancel"
    @lostpointercapture="onPointerCancel"
  >
    <TransitionGroup name="obstacle">
      <div v-for="cell in targetCells" :key="`t${cell}`" class="cell-layer cell-layer--target" :style="cellStyle(cell)">
        <ObstacleArt type="target" />
      </div>
    </TransitionGroup>

    <div
      v-for="piece in pieces"
      :key="piece.id"
      class="piece"
      :class="{
        'piece--clearing': piece.clearing,
        'piece--firing': piece.firing,
        'piece--selected': isSelected(piece),
        'piece--hint': hintIds.has(piece.id),
      }"
      :style="{
        transform: `translate3d(${piece.col * 100}%, ${piece.row * 100}%, 0)`,
        transitionDuration: `${piece.durationMs}ms`,
      }"
    >
      <div class="piece__inner">
        <ShapePiece :kind="piece.kind" :special="piece.special" />
      </div>
    </div>

    <TransitionGroup name="obstacle">
      <div
        v-for="cell in crateCells"
        :key="`c${cell}`"
        class="cell-layer cell-layer--crate"
        :class="{ 'cell-layer--strong': (field?.crates[cell] ?? 0) >= 2 }"
        :style="cellStyle(cell)"
      >
        <ObstacleArt type="crate" :hp="field?.crates[cell]" />
      </div>
    </TransitionGroup>

    <TransitionGroup name="obstacle">
      <div v-for="cell in chainCells" :key="`k${cell}`" class="cell-layer cell-layer--chain" :style="cellStyle(cell)">
        <ObstacleArt type="chain" />
      </div>
    </TransitionGroup>

    <div
      v-for="effect in effects"
      :key="`fx${effect.id}`"
      class="fx"
      :class="`fx--${effect.type}`"
      :style="effectStyle(effect)"
      aria-hidden="true"
    >
      <template v-if="effect.type === 'pop'">
        <span class="fx__ring" />
        <span
          v-for="(drop, i) in DROPS"
          :key="i"
          class="fx__drop"
          :style="{ '--angle': `${drop.angle}deg`, '--dist': drop.distance }"
        />
      </template>
      <span v-else-if="effect.type === 'line-h' || effect.type === 'line-v'" class="fx__beam" />
      <span v-else class="fx__wave" />
    </div>
  </div>
</template>

<style scoped>
.board {
  /* A light garden-green checkerboard. */
  --board-a: color-mix(in srgb, #6cc35a 9%, var(--color-surface));
  --board-b: color-mix(in srgb, #6cc35a 20%, var(--color-surface-2));
  /* Effect colours per kind (match the fruit colours in ShapePiece). */
  --fx-0: #f0213f;
  --fx-1: #ff8a00;
  --fx-2: #ffd21a;
  --fx-3: #22b34c;
  --fx-4: #2f7dff;
  --fx-5: #9b40f2;
  --fx-item: #c9853d;

  position: relative;
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: var(--radius-lg);
  background: repeating-conic-gradient(var(--board-a) 0 25%, var(--board-b) 0 50%) 0 0 / 25% 25%;
  box-shadow: var(--shadow-sm);
  touch-action: none;
  cursor: pointer;
}

.cell-layer {
  position: absolute;
  width: 12.5%;
  height: 12.5%;
  pointer-events: none;
}

.cell-layer--target {
  padding: calc(12.5% * 0.02);
}

.cell-layer--crate {
  z-index: 1;
  padding: calc(12.5% * 0.03);
}

.cell-layer--chain {
  z-index: 2;
  padding: calc(12.5% * 0.04);
}

.obstacle-leave-active {
  transition:
    opacity var(--dur-slow) var(--ease-out),
    transform var(--dur-slow) var(--ease-out);
}

.obstacle-leave-to {
  opacity: 0;
  transform: scale(1.35);
}

.piece {
  position: absolute;
  top: 0;
  left: 0;
  width: 12.5%;
  height: 12.5%;
  /* Percentage padding refers to the board width: 12.5% × 0.07 = 7% of one cell. */
  padding: calc(12.5% * 0.07);
  transition-property: transform;
  /* Slight overshoot: pieces land with a small bounce. */
  transition-timing-function: cubic-bezier(0.3, 0.9, 0.35, 1.12);
  will-change: transform;
  pointer-events: none;
}

.piece__inner {
  width: 100%;
  height: 100%;
  transition:
    transform var(--dur-med) var(--ease-out),
    opacity var(--dur-med) var(--ease-out),
    filter var(--dur-fast);
}

.piece--selected .piece__inner {
  transform: scale(1.14);
  animation: selected-wiggle 0.6s ease-in-out infinite;
  filter: drop-shadow(0 0 4px var(--color-accent)) drop-shadow(0 2px 4px rgb(0 0 0 / 25%));
}

.piece--hint .piece__inner {
  animation: hint-pulse 1.1s ease-in-out infinite;
}

.piece--clearing .piece__inner {
  animation: piece-pop var(--clear-ms, 260ms) var(--ease-out) forwards;
}

.piece--firing .piece__inner {
  filter: brightness(1.5) drop-shadow(0 0 6px #fff);
}

/* --- Effects ------------------------------------------------------------------- */

.fx {
  position: absolute;
  z-index: 3;
  width: 12.5%;
  height: 12.5%;
  pointer-events: none;
  transform: translate(-50%, -50%);
}

.fx__ring {
  position: absolute;
  inset: 10%;
  border: 3px solid var(--fx-color);
  border-radius: 50%;
  animation: fx-ring 0.45s var(--ease-out) forwards;
}

.fx__drop {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 16%;
  height: 16%;
  margin: -8% 0 0 -8%;
  border-radius: 50%;
  background: var(--fx-color);
  animation: fx-drop 0.55s cubic-bezier(0.2, 0.7, 0.4, 1) forwards;
}

.fx--line-h,
.fx--line-v {
  z-index: 4;
}

.fx__beam {
  position: absolute;
  top: 50%;
  left: 50%;
  border-radius: 999px;
  background: linear-gradient(90deg, transparent, #fff 20%, #fff8c4 50%, #fff 80%, transparent);
  box-shadow:
    0 0 10px 3px rgb(255 220 120 / 80%),
    0 0 24px 6px rgb(255 140 0 / 45%);
}

.fx--line-h .fx__beam {
  width: 800%;
  height: 34%;
  animation: fx-beam-h 0.5s var(--ease-out) forwards;
}

.fx--line-v .fx__beam {
  width: 34%;
  height: 800%;
  background: linear-gradient(180deg, transparent, #fff 20%, #fff8c4 50%, #fff 80%, transparent);
  animation: fx-beam-v 0.5s var(--ease-out) forwards;
}

.fx--burst,
.fx--prism {
  z-index: 4;
}

.fx__wave {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 300%;
  height: 300%;
  border-radius: 50%;
  background: radial-gradient(circle, rgb(255 255 255 / 95%) 0 20%, rgb(255 190 60 / 80%) 40%, rgb(255 80 0 / 0%) 70%);
  animation: fx-wave 0.5s var(--ease-out) forwards;
}

.fx--prism .fx__wave {
  width: 900%;
  height: 900%;
  background: conic-gradient(#f0213f, #ff8a00, #ffd21a, #22b34c, #2f7dff, #9b40f2, #f0213f);
  mask: radial-gradient(circle, transparent 30%, #000 32%, #000 40%, transparent 42%);
  animation: fx-prism 0.6s var(--ease-out) forwards;
}

@keyframes piece-pop {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  35% {
    transform: scale(1.3) rotate(-6deg);
    opacity: 1;
  }
  100% {
    transform: scale(0.1) rotate(20deg);
    opacity: 0;
  }
}

@keyframes fx-ring {
  from {
    transform: scale(0.4);
    opacity: 0.9;
  }
  to {
    transform: scale(1.5);
    opacity: 0;
  }
}

@keyframes fx-drop {
  from {
    transform: rotate(var(--angle)) translateY(0) scale(1);
    opacity: 1;
  }
  to {
    transform: rotate(var(--angle)) translateY(calc(-260% * var(--dist))) scale(0.3);
    opacity: 0;
  }
}

@keyframes fx-beam-h {
  from {
    transform: translate(-50%, -50%) scaleX(0.05);
    opacity: 1;
  }
  40% {
    opacity: 1;
  }
  to {
    transform: translate(-50%, -50%) scaleX(1) scaleY(0.4);
    opacity: 0;
  }
}

@keyframes fx-beam-v {
  from {
    transform: translate(-50%, -50%) scaleY(0.05);
    opacity: 1;
  }
  40% {
    opacity: 1;
  }
  to {
    transform: translate(-50%, -50%) scaleY(1) scaleX(0.4);
    opacity: 0;
  }
}

@keyframes fx-wave {
  from {
    transform: translate(-50%, -50%) scale(0.2);
    opacity: 1;
  }
  to {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0;
  }
}

@keyframes fx-prism {
  from {
    transform: translate(-50%, -50%) scale(0.1) rotate(0deg);
    opacity: 1;
  }
  to {
    transform: translate(-50%, -50%) scale(1) rotate(120deg);
    opacity: 0;
  }
}

@keyframes hint-pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.18);
  }
}

@keyframes selected-wiggle {
  0%,
  100% {
    transform: scale(1.14) rotate(0deg);
  }
  25% {
    transform: scale(1.14) rotate(-5deg);
  }
  75% {
    transform: scale(1.14) rotate(5deg);
  }
}

:root[data-motion='reduced'] .piece--hint .piece__inner {
  animation: none;
  filter: drop-shadow(0 0 5px var(--color-accent));
}

:root[data-motion='reduced'] .piece--selected .piece__inner {
  animation: none;
}

:root[data-motion='reduced'] .fx {
  display: none;
}
</style>
