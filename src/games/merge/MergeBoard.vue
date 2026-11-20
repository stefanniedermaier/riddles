<script setup lang="ts">
import { onBeforeUnmount } from 'vue'

import { t } from '@/core/i18n'
import { resolvedTheme } from '@/core/theme'
import type { Direction } from './logic/engine'
import { tileColors } from './palette'

export interface DisplayTile {
  id: number
  value: number
  cell: number
  /** `new`: just spawned, `merged`: created by a merge in the last move. */
  state: 'normal' | 'new' | 'merged'
}

const props = defineProps<{
  size: number
  tiles: readonly DisplayTile[]
}>()

const emit = defineEmits<{ move: [direction: Direction] }>()

/** Minimum swipe distance in px (on the dominant axis). */
const SWIPE_THRESHOLD = 24

function tileStyle(tile: DisplayTile): Record<string, string> {
  const row = Math.floor(tile.cell / props.size)
  const col = tile.cell % props.size
  const colors = tileColors(tile.value, resolvedTheme.value)
  return {
    transform: `translate(calc(${col} * (100% + var(--gap))), calc(${row} * (100% + var(--gap))))`,
    '--tile-bg': colors.background,
    '--tile-fg': colors.color,
  }
}

function slotStyle(cell: number): Record<string, string> {
  const row = Math.floor(cell / props.size)
  const col = cell % props.size
  return { transform: `translate(calc(${col} * (100% + var(--gap))), calc(${row} * (100% + var(--gap))))` }
}

function digitsClass(value: number): string {
  return `tile--d${Math.min(5, String(value).length)}`
}

// --- Swipe -----------------------------------------------------------------------

let start: { id: number; x: number; y: number } | null = null

function onPointerDown(event: PointerEvent): void {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  start = { id: event.pointerId, x: event.clientX, y: event.clientY }
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerCancel)
}

function stopTracking(): void {
  start = null
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerCancel)
}

function onPointerUp(event: PointerEvent): void {
  if (!start || event.pointerId !== start.id) return
  const dx = event.clientX - start.x
  const dy = event.clientY - start.y
  stopTracking()
  if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD) return
  if (Math.abs(dx) > Math.abs(dy)) emit('move', dx > 0 ? 'right' : 'left')
  else emit('move', dy > 0 ? 'down' : 'up')
}

function onPointerCancel(): void {
  stopTracking()
}

onBeforeUnmount(stopTracking)
</script>

<template>
  <div
    class="merge-board no-select"
    :style="{ '--n': size }"
    role="grid"
    :aria-label="t('merge.play.board')"
    @pointerdown="onPointerDown"
    @contextmenu.prevent
  >
    <div class="merge-board__inner">
      <div v-for="cell in size * size" :key="`s${cell}`" class="slot" :style="slotStyle(cell - 1)" />
      <div
        v-for="tile in tiles"
        :key="tile.id"
        class="tile"
        :class="[`tile--${tile.state}`, digitsClass(tile.value)]"
        :style="tileStyle(tile)"
        role="gridcell"
        :aria-label="String(tile.value)"
      >
        <span class="tile__face tabular">{{ tile.value }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.merge-board {
  --gap: calc(28px / var(--n));

  width: 100%;
  aspect-ratio: 1;
  padding: var(--gap);
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--game-merge) 16%, var(--color-surface-2));
  box-shadow: var(--shadow-sm);
  touch-action: none;
  cursor: grab;
}

.merge-board__inner {
  position: relative;
  width: 100%;
  height: 100%;
  container-type: size;
}

.slot,
.tile {
  position: absolute;
  top: 0;
  left: 0;
  width: calc((100% - (var(--n) - 1) * var(--gap)) / var(--n));
  height: calc((100% - (var(--n) - 1) * var(--gap)) / var(--n));
  border-radius: calc(var(--radius-md) * 4 / var(--n));
}

.slot {
  background: color-mix(in srgb, var(--color-surface) 70%, transparent);
}

.tile {
  z-index: 1;
  transition: transform var(--dur-fast) ease-out;
  will-change: transform;
}

.tile__face {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  background: var(--tile-bg);
  color: var(--tile-fg);
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.02em;
  box-shadow: inset 0 -3px 0 rgb(0 0 0 / 12%);
}

/* Font size relative to the tile size (100cqw = board width). */
.tile--d1 .tile__face,
.tile--d2 .tile__face {
  font-size: calc(100cqw / var(--n) * 0.44);
}

.tile--d3 .tile__face {
  font-size: calc(100cqw / var(--n) * 0.34);
}

.tile--d4 .tile__face {
  font-size: calc(100cqw / var(--n) * 0.26);
}

.tile--d5 .tile__face {
  font-size: calc(100cqw / var(--n) * 0.21);
}

.tile--merged {
  z-index: 2;
}

.tile--merged .tile__face {
  animation: tile-pop var(--dur-med) ease-out;
}

.tile--new .tile__face {
  animation: tile-appear var(--dur-med) ease-out both;
  animation-delay: calc(var(--dur-fast) * 0.5);
}

@keyframes tile-pop {
  50% {
    transform: scale(1.14);
  }
}

@keyframes tile-appear {
  from {
    transform: scale(0.2);
    opacity: 0;
  }
}
</style>
