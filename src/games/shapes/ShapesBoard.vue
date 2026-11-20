<script setup lang="ts">
import { computed, ref } from 'vue'

import { t } from '@/core/i18n'
import type { DisplayPiece, ScorePopup } from './animator'
import { SIZE, areAdjacent, cellAt } from './logic/types'
import ShapePiece from './ShapePiece.vue'

const props = defineProps<{
  pieces: DisplayPiece[]
  popups: ScorePopup[]
  /** Selected cell (tap-tap input). */
  selected: number | null
  /** Two cells of a suggested move. */
  hint: [number, number] | null
  /** Ignore input (animations running, paused, finished). */
  locked: boolean
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

function popupStyle(popup: ScorePopup) {
  return {
    left: `${((popup.col + 0.5) / SIZE) * 100}%`,
    top: `${((popup.row + 0.5) / SIZE) * 100}%`,
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

    <div
      v-for="popup in popups"
      :key="`p${popup.id}`"
      class="popup tabular"
      :style="popupStyle(popup)"
    >
      {{ popup.text }}
    </div>
  </div>
</template>

<style scoped>
.board {
  --board-a: var(--color-surface);
  --board-b: var(--color-surface-2);

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

.piece {
  position: absolute;
  top: 0;
  left: 0;
  width: 12.5%;
  height: 12.5%;
  /* Percentage padding refers to the board width: 12.5% × 0.07 = 7% of one cell. */
  padding: calc(12.5% * 0.07);
  transition-property: transform;
  transition-timing-function: cubic-bezier(0.3, 0.7, 0.4, 1);
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
  filter: drop-shadow(0 0 4px var(--color-accent)) drop-shadow(0 2px 4px rgb(0 0 0 / 25%));
}

.piece--hint .piece__inner {
  animation: hint-pulse 1.1s ease-in-out infinite;
}

.piece--clearing .piece__inner {
  transform: scale(0.15) rotate(25deg);
  opacity: 0;
}

.piece--firing .piece__inner {
  filter: brightness(1.6);
}

.popup {
  position: absolute;
  z-index: 2;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  background: var(--color-text);
  color: var(--color-bg);
  font-size: var(--text-sm);
  font-weight: 800;
  pointer-events: none;
  transform: translate(-50%, -50%);
  animation: popup-rise 0.9s var(--ease-out) forwards;
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

@keyframes popup-rise {
  0% {
    opacity: 0;
    transform: translate(-50%, -30%) scale(0.8);
  }
  20% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -140%) scale(1);
  }
}

:root[data-motion='reduced'] .piece--hint .piece__inner {
  animation: none;
  filter: drop-shadow(0 0 5px var(--color-accent));
}

:root[data-motion='reduced'] .popup {
  display: none;
}
</style>
