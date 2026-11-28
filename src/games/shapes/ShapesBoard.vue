<script setup lang="ts">
import { computed, ref } from 'vue'

import { t } from '@/core/i18n'
import { createTouchGuard } from '@/core/touchGuard'
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
  /** Game lost: the pieces tumble off the board. */
  collapse?: boolean
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

/** A second finger (pinch to zoom) cancels the swipe: its movement is no move. */
const touches = createTouchGuard()

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
  if (!touches.down(event)) {
    gesture = null
    return
  }
  if (props.locked || !event.isPrimary) return
  const cell = cellFromPoint(event.clientX, event.clientY)
  if (cell === null) return
  gesture = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, cell }
  boardEl.value?.setPointerCapture?.(event.pointerId)
}

function onPointerMove(event: PointerEvent): void {
  if (!gesture || touches.multi || gesture.pointerId !== event.pointerId || props.locked) return
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
  touches.up(event)
  if (!gesture || gesture.pointerId !== event.pointerId) return
  const cell = gesture.cell
  gesture = null
  if (props.locked) return
  tap(cell)
}

/** A tap (or Enter on the keyboard cursor): select, deselect, or swap with the selected neighbour. */
function tap(cell: number): void {
  if (props.selected === null) emit('select', cell)
  else if (props.selected === cell) emit('select', null)
  else if (areAdjacent(props.selected, cell)) {
    const from = props.selected
    emit('select', null)
    emit('swap', from, cell)
  } else emit('select', cell)
}

function onPointerCancel(event: PointerEvent): void {
  touches.up(event)
  gesture = null
}

// --- Keyboard: a cursor; Enter/Space taps the cell under it --------------------------

const cursor = ref(cellAt(SIZE / 2 - 1, SIZE / 2 - 1))
/** Read out after each cursor move (the pieces themselves are decorative). */
const cursorText = ref('')

const SPECIAL_KEY = { 'line-h': 'lineH', 'line-v': 'lineV', burst: 'burst', prism: 'prism' } as const

function cellText(cell: number): string {
  const row = Math.floor(cell / SIZE)
  const col = cell % SIZE
  const piece = props.pieces.find((p) => p.row === row && p.col === col && !p.clearing)
  let text = t('shapes.board.empty')
  if (piece) {
    text = t(`shapes.kinds.k${piece.kind as 0 | 1 | 2 | 3 | 4 | 5}`)
    if (piece.special !== 'none') text += `, ${t(`shapes.specials.${SPECIAL_KEY[piece.special]}`)}`
  }
  return t('shapes.board.cell', { row: row + 1, col: col + 1, piece: text })
}

function onKeydown(event: KeyboardEvent): void {
  let row = Math.floor(cursor.value / SIZE)
  let col = cursor.value % SIZE
  switch (event.key) {
    case 'ArrowUp':
      row = Math.max(0, row - 1)
      break
    case 'ArrowDown':
      row = Math.min(SIZE - 1, row + 1)
      break
    case 'ArrowLeft':
      col = Math.max(0, col - 1)
      break
    case 'ArrowRight':
      col = Math.min(SIZE - 1, col + 1)
      break
    case ' ':
    case 'Enter':
      event.preventDefault()
      emit('interact')
      if (!props.locked) tap(cursor.value)
      return
    case 'Escape':
      if (props.selected === null) return
      event.preventDefault()
      event.stopPropagation()
      emit('select', null)
      return
    default:
      return
  }
  event.preventDefault()
  emit('interact')
  cursor.value = cellAt(row, col)
  cursorText.value = cellText(cursor.value)
}

const hintIds = computed(() => {
  if (!props.hint) return new Set<number>()
  const [a, b] = props.hint
  const cells = new Set([a, b])
  return new Set(
    props.pieces.filter((p) => cells.has(cellAt(p.row, p.col)) && !p.clearing).map((p) => p.id),
  )
})

/** Beams and waves are DOM effects; juice splashes are canvas particles (BoardParticles). */
const beamEffects = computed(() => props.effects.filter((effect) => effect.type !== 'pop'))

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
    :class="{ 'board--collapse': collapse }"
    role="application"
    :aria-label="t('shapes.board.label')"
    tabindex="0"
    @keydown="onKeydown"
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
        'piece--fall': piece.ease === 'fall',
      }"
      :style="{
        transform: `translate3d(${piece.col * 100}%, ${piece.row * 100}%, 0)`,
        transitionDuration: `${piece.durationMs}ms`,
        '--drop': SIZE - piece.row,
        '--delay': `${(SIZE - 1 - piece.row) * 45 + ((piece.col * 37) % 80)}ms`,
        '--spin': `${((piece.id * 47) % 90) - 45}deg`,
      }"
    >
      <div class="piece__inner">
        <!-- Re-created on every fall (key), which restarts the landing squash. -->
        <div
          :key="piece.land"
          class="piece__land"
          :class="{ 'piece__land--go': piece.land > 0 && !piece.appear, 'piece__land--appear': piece.appear }"
          :style="{ animationDelay: `${piece.landDelayMs}ms` }"
        >
          <ShapePiece :kind="piece.kind" :special="piece.special" />
        </div>
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

    <div class="cursor" :style="cellStyle(cursor)" aria-hidden="true" />
    <p class="visually-hidden" aria-live="polite">{{ cursorText }}</p>

    <TransitionGroup name="obstacle">
      <div v-for="cell in chainCells" :key="`k${cell}`" class="cell-layer cell-layer--chain" :style="cellStyle(cell)">
        <ObstacleArt type="chain" />
      </div>
    </TransitionGroup>

    <div
      v-for="effect in beamEffects"
      :key="`fx${effect.id}`"
      class="fx"
      :class="`fx--${effect.type}`"
      :style="effectStyle(effect)"
      aria-hidden="true"
    >
      <span v-if="effect.type === 'line-h' || effect.type === 'line-v'" class="fx__beam" />
      <span v-else class="fx__wave" />
    </div>
  </div>
</template>

<style scoped>
.board {
  /* Cream / pale-green tiles; slightly see-through so the frame's wood glows through. */
  --board-a: rgb(255 250 232 / 92%);
  --board-b: rgb(232 243 208 / 92%);
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
  border-radius: 16px;
  background: repeating-conic-gradient(var(--board-a) 0 25%, var(--board-b) 0 50%) 0 0 / 25% 25%;
  /* Sunk into the frame. */
  box-shadow:
    inset 0 4px 10px rgb(60 30 0 / 30%),
    inset 0 0 0 1px rgb(90 53 21 / 35%);
  /* Two-finger zoom stays possible (low vision); one finger never scrolls the page. */
  touch-action: pinch-zoom;
  cursor: pointer;
}

:root[data-theme='dark'] .board {
  --board-a: rgb(52 58 84 / 92%);
  --board-b: rgb(40 46 70 / 92%);
}

/* Keyboard cursor, shown while the board has keyboard focus. */
.cursor {
  position: absolute;
  z-index: 5;
  display: none;
  width: 12.5%;
  height: 12.5%;
  outline: 3px dashed var(--color-text);
  outline-offset: -4px;
  pointer-events: none;
}

.board:focus-visible .cursor {
  display: block;
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
  /* No permanent will-change: 64 always-promoted layers cost memory; the browser promotes a
    piece by itself while its transform transitions. */
  pointer-events: none;
}

/* Falling pieces accelerate like under gravity and land with a squash (below). */
.piece--fall {
  transition-timing-function: cubic-bezier(0.45, 0, 0.85, 0.55);
}

.piece__land {
  width: 100%;
  height: 100%;
  transform-origin: 50% 92%;
}

.piece__land--go {
  animation: land-squash 0.32s ease-out both;
}

/* New pieces below an obstacle cannot fall in from above: they grow in their cell. */
.piece__land--appear {
  animation: piece-appear 0.3s var(--ease-out) both;
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

@keyframes piece-appear {
  0% {
    transform: scale(0.1);
    opacity: 0;
  }
  60% {
    transform: scale(1.12);
    opacity: 1;
  }
  100% {
    transform: none;
  }
}

@keyframes land-squash {
  0% {
    transform: none;
  }
  25% {
    transform: scale(1.16, 0.8);
  }
  55% {
    transform: scale(0.94, 1.08) translateY(-4%);
  }
  80% {
    transform: scale(1.03, 0.97);
  }
  100% {
    transform: none;
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

/* Lost: every piece hops, then falls out of the board (bottom rows first). */
.board--collapse .piece__inner {
  animation: collapse-fall 0.8s cubic-bezier(0.5, 0, 0.9, 0.5) var(--delay) forwards;
}

.board--collapse .cell-layer {
  transition: opacity 0.6s;
  opacity: 0.3;
}

@keyframes collapse-fall {
  0% {
    transform: none;
  }
  18% {
    transform: translateY(-14%) rotate(calc(var(--spin) * -0.2));
  }
  100% {
    transform: translateY(calc(var(--drop) * 100% + 60%)) rotate(var(--spin));
    opacity: 0.6;
  }
}

:root[data-motion='reduced'] .piece__land--go,
:root[data-motion='reduced'] .piece__land--appear {
  animation: none;
}

/* Reduced motion: matched pieces fade (no pop) before they are removed. */
:root[data-motion='reduced'] .piece--clearing .piece__inner {
  animation: none;
  opacity: 0.3;
}

:root[data-motion='reduced'] .fx {
  display: none;
}
</style>
