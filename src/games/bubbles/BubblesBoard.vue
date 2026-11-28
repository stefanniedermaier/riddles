<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId, watch } from 'vue'

import { t } from '@/core/i18n'
import { motionEnabled } from '@/core/theme'
import { createTouchGuard } from '@/core/touchGuard'
import BubbleArt from './BubbleArt.vue'
import { COLOR_KEYS } from './colors'
import { BOARD_HEIGHT, CELLS, centre, COLS, DANGER_Y, isCell, RADIUS, SHOOTER_X, SHOOTER_Y, type Parity, type Point } from './logic/grid'
import { angleTowards, trace } from './logic/trace'
import { BOMB, EMPTY, isColor, RAINBOW, type Shot } from './logic/types'
import type { AimLine } from './settings'

/**
 * The field: bubbles in their hex grid, the danger line and the shooter with the current and
 * the next bubble.
 *
 * Input: press anywhere on the field and drag to aim – the aim line follows the finger and
 * shows the real flight (the same `trace` as the shot) – and let go to shoot. Dragging back
 * below the shooter cancels. The next bubble is a button: tap it to swap.
 *
 * Animation: a shot flies along its path (`flight`) and `landed` fires at the end; popped
 * bubbles shrink away, falling ones drop (`ghosts`), a new row slides in (`pushKey`). With
 * reduced motion the flight is faster and pops and falls simply fade.
 */
export interface Flight {
  id: number
  points: readonly Point[]
  value: Shot
}

export interface Ghost {
  id: number
  x: number
  y: number
  value: number
  kind: 'pop' | 'fall'
  /** Stagger in ms. */
  delay: number
}

const props = defineProps<{
  cells: readonly number[]
  parity: Parity
  marked: readonly number[]
  current: Shot
  next: Shot
  symbols: boolean
  aimMode: AimLine
  /** Show the aim line without dragging (keyboard aiming). */
  showAim: boolean
  /** No aiming or shooting (shot in flight, paused, game over). */
  locked: boolean
  flight: Flight | null
  ghosts: readonly Ghost[]
  pushKey: number
  /** The field is one row from the danger line. */
  danger: boolean
}>()

const angle = defineModel<number>('angle', { required: true })

const emit = defineEmits<{ shoot: [angle: number]; swap: []; landed: [id: number]; tap: []; multitouch: [] }>()

const shineId = `bubbles-shine-${useId()}`

const NEXT: Point = { x: SHOOTER_X + 2.1, y: SHOOTER_Y + 0.2 }
/** Flight speed in bubble diameters per second. */
const SPEED = 30
const SPEED_REDUCED = 70
/** The `short` aim line ends after this length. */
const SHORT_LENGTH = 3.2

const bubbles = computed(() => {
  const marked = new Set(props.marked)
  const result: { cell: number; value: number; x: number; y: number; marked: boolean }[] = []
  for (let cell = 0; cell < CELLS; cell++) {
    const value = props.cells[cell]!
    if (value === EMPTY || !isCell(cell, props.parity)) continue
    const { x, y } = centre(cell, props.parity)
    result.push({ cell, value, x, y, marked: marked.has(cell) })
  }
  return result
})

// --- Aiming --------------------------------------------------------------------------

const dragging = ref(false)
const aimShown = computed(() => !props.locked && (dragging.value || props.showAim))

const aim = computed(() => trace(props.cells, props.parity, angle.value))

/** The aim line as a polyline, cut to the chosen length. */
const aimPath = computed(() => {
  const points = aim.value.points
  let path = `M${points[0]!.x.toFixed(3)} ${points[0]!.y.toFixed(3)}`
  if (props.aimMode === 'short') {
    let left = SHORT_LENGTH
    for (let i = 1; i < points.length && left > 0; i++) {
      const a = points[i - 1]!
      const b = points[i]!
      const length = Math.hypot(b.x - a.x, b.y - a.y)
      const f = Math.min(1, left / length)
      path += ` L${(a.x + (b.x - a.x) * f).toFixed(3)} ${(a.y + (b.y - a.y) * f).toFixed(3)}`
      left -= length
    }
    return path
  }
  for (const p of points.slice(1)) path += ` L${p.x.toFixed(3)} ${p.y.toFixed(3)}`
  return path
})

const landing = computed(() =>
  props.aimMode === 'full' && aim.value.cell >= 0 ? centre(aim.value.cell, props.parity) : null,
)

/** The shooter's pointer, always visible: where a shot would go. */
const nub = computed(() => {
  const radians = (angle.value * Math.PI) / 180
  return { x: SHOOTER_X + Math.cos(radians) * 0.95, y: SHOOTER_Y - Math.sin(radians) * 0.95 }
})

const root = ref<HTMLElement | null>(null)
const touches = createTouchGuard()
let pointerId: number | null = null

function boardPoint(event: PointerEvent): Point | null {
  const svg = root.value?.querySelector('svg')
  const rect = svg?.getBoundingClientRect()
  if (!rect || rect.width === 0) return null
  return {
    x: ((event.clientX - rect.left) / rect.width) * COLS,
    y: ((event.clientY - rect.top) / rect.height) * BOARD_HEIGHT,
  }
}

/** Dragged back below the shooter: let go there to cancel. */
const cancelling = ref(false)

function track(event: PointerEvent): void {
  const point = boardPoint(event)
  if (!point) return
  cancelling.value = point.y > SHOOTER_Y + RADIUS
  if (!cancelling.value) angle.value = angleTowards(point)
}

function onPointerDown(event: PointerEvent): void {
  if (!touches.down(event)) {
    stop()
    emit('multitouch')
    return
  }
  if ((event.target as Element | null)?.closest('button')) return
  if (event.pointerType === 'mouse' && event.button !== 0) return
  if (props.locked) {
    emit('tap')
    return
  }
  pointerId = event.pointerId
  dragging.value = true
  track(event)
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerCancel)
}

function onPointerMove(event: PointerEvent): void {
  if (event.pointerId !== pointerId || touches.multi) return
  track(event)
}

function stop(): void {
  pointerId = null
  dragging.value = false
  cancelling.value = false
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerCancel)
}

function onPointerUp(event: PointerEvent): void {
  touches.up(event)
  if (event.pointerId !== pointerId) return
  const fire = dragging.value && !cancelling.value && !touches.multi && !props.locked
  stop()
  if (fire) emit('shoot', angle.value)
}

function onPointerCancel(event: PointerEvent): void {
  touches.up(event)
  stop()
}

watch(
  () => props.locked,
  (locked) => {
    if (locked) stop()
  },
)

// --- Flight --------------------------------------------------------------------------

const flyingAt = ref<Point | null>(null)
let frame = 0

watch(
  () => props.flight,
  (flight) => {
    cancelAnimationFrame(frame)
    if (!flight) {
      flyingAt.value = null
      return
    }
    const points = flight.points
    const lengths = points.slice(1).map((p, i) => Math.hypot(p.x - points[i]!.x, p.y - points[i]!.y))
    const total = lengths.reduce((a, b) => a + b, 0)
    const speed = motionEnabled.value ? SPEED : SPEED_REDUCED
    const duration = (total / speed) * 1000
    let start: number | null = null
    const step = (now: number) => {
      start ??= now
      const travelled = Math.min(total, ((now - start) / duration) * total)
      let left = travelled
      let i = 0
      while (i < lengths.length - 1 && left > lengths[i]!) left -= lengths[i++]!
      const a = points[i]!
      const b = points[i + 1] ?? a
      const f = lengths[i] ? left / lengths[i]! : 1
      flyingAt.value = { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }
      if (travelled >= total) {
        flyingAt.value = null
        emit('landed', flight.id)
        return
      }
      frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
  },
)

onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  stop()
})

// --- Labels --------------------------------------------------------------------------

function bubbleName(shot: Shot): string {
  if (isColor(shot)) return t(`bubbles.colorNames.${COLOR_KEYS[shot]!}`)
  if (shot === BOMB) return t('bubbles.play.special.bomb')
  if (shot === RAINBOW) return t('bubbles.play.special.rainbow')
  return ''
}

const nextStyle = {
  left: `${((NEXT.x - 0.6) / COLS) * 100}%`,
  top: `${((NEXT.y - 0.6) / BOARD_HEIGHT) * 100}%`,
  width: `${(1.2 / COLS) * 100}%`,
}
</script>

<template>
  <div
    ref="root"
    class="bubbles-board no-select"
    :class="{ 'bubbles-board--aiming': dragging, 'bubbles-board--locked': locked }"
    :style="{ aspectRatio: `${COLS} / ${BOARD_HEIGHT}` }"
    @pointerdown="onPointerDown"
    @contextmenu.prevent
  >
    <svg :viewBox="`0 0 ${COLS} ${BOARD_HEIGHT.toFixed(3)}`" role="img" :aria-label="t('bubbles.play.board')">
      <defs>
        <radialGradient :id="shineId" cx="0.36" cy="0.3" r="0.7">
          <stop offset="0" stop-color="#fff" stop-opacity="0.75" />
          <stop offset="0.25" stop-color="#fff" stop-opacity="0.18" />
          <stop offset="0.7" stop-color="#fff" stop-opacity="0" />
          <stop offset="1" stop-color="#000" stop-opacity="0.18" />
        </radialGradient>
      </defs>
      <rect class="field" :width="COLS" :height="BOARD_HEIGHT" />
      <line class="danger" :class="{ 'danger--near': danger }" x1="0.1" :x2="COLS - 0.1" :y1="DANGER_Y" :y2="DANGER_Y" />

      <g :key="pushKey" class="bubbles" :class="{ 'bubbles--pushed': pushKey > 0 }">
        <BubbleArt
          v-for="b in bubbles"
          :key="b.cell"
          :value="b.value"
          :x="b.x"
          :y="b.y"
          :marked="b.marked"
          :symbols="symbols"
          :shine="shineId"
        />
      </g>

      <g class="ghosts">
        <g v-for="g in ghosts" :key="g.id" :class="`ghost ghost--${g.kind}`" :style="{ animationDelay: `${g.delay}ms` }">
          <BubbleArt :value="g.value" :x="g.x" :y="g.y" :symbols="symbols" :shine="shineId" />
        </g>
      </g>

      <g v-if="aimShown && !cancelling" class="aim">
        <path class="aim__line" :d="aimPath" />
        <circle v-if="landing" class="aim__landing" :cx="landing.x" :cy="landing.y" r="0.44" />
      </g>

      <g class="shooter">
        <path class="shooter__base" :d="`M${SHOOTER_X - 1.1} ${BOARD_HEIGHT} A1.1 1.1 0 0 1 ${SHOOTER_X + 1.1} ${BOARD_HEIGHT}`" />
        <line class="shooter__nub" :x1="SHOOTER_X" :y1="SHOOTER_Y" :x2="nub.x" :y2="nub.y" />
        <BubbleArt v-if="!flight" class="shooter__current" :value="current" :x="SHOOTER_X" :y="SHOOTER_Y" :symbols="symbols" :shine="shineId" />
        <g class="shooter__next" :transform="`translate(${NEXT.x} ${NEXT.y}) scale(0.78) translate(${-NEXT.x} ${-NEXT.y})`">
          <BubbleArt :value="next" :x="NEXT.x" :y="NEXT.y" :symbols="symbols" :shine="shineId" />
        </g>
      </g>

      <BubbleArt v-if="flyingAt && flight" :value="flight.value" :x="flyingAt.x" :y="flyingAt.y" :symbols="symbols" :shine="shineId" />
    </svg>
    <button
      type="button"
      class="swap"
      :style="nextStyle"
      :disabled="locked"
      :aria-label="t('bubbles.play.next', { bubble: bubbleName(next) })"
      @click="emit('swap')"
    />
    <span class="visually-hidden">{{ t('bubbles.play.current', { bubble: bubbleName(current) }) }}</span>
  </div>
</template>

<style scoped>
.bubbles-board {
  position: relative;
  width: 100%;
  touch-action: none;
  cursor: crosshair;
}

.bubbles-board--locked {
  cursor: default;
}

svg {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.field {
  fill: color-mix(in srgb, var(--game-bubbles) 9%, var(--color-surface));
  stroke: color-mix(in srgb, var(--game-bubbles) 30%, var(--color-surface));
  stroke-width: 0.06;
}

.danger {
  stroke: color-mix(in srgb, var(--color-text) 35%, transparent);
  stroke-width: 0.05;
  stroke-dasharray: 0.25 0.18;
}

/* Close to the line: red, blinking twice (≤ 3 flashes per second; none with reduced motion). */
.danger--near {
  stroke: var(--color-error);
  stroke-width: 0.09;
  animation: warn 0.5s ease-in-out 4 alternate;
}

@keyframes warn {
  to {
    opacity: 0.25;
  }
}

.bubbles--pushed {
  animation: push-in 0.32s var(--ease-emphasized);
}

@keyframes push-in {
  from {
    transform: translateY(-0.866px);
  }
}

.ghost--pop {
  animation: pop 0.26s ease-in forwards;
  transform-box: fill-box;
  transform-origin: center;
}

.ghost--fall {
  animation: fall 0.7s cubic-bezier(0.5, 0, 1, 0.6) forwards;
}

@keyframes pop {
  50% {
    transform: scale(1.18);
    opacity: 0.9;
  }

  to {
    transform: scale(0.2);
    opacity: 0;
  }
}

@keyframes fall {
  to {
    transform: translateY(8px);
    opacity: 0;
  }
}

:root[data-motion='reduced'] .danger--near,
:root[data-motion='reduced'] .bubbles--pushed {
  animation: none;
}

:root[data-motion='reduced'] .ghost--pop,
:root[data-motion='reduced'] .ghost--fall {
  animation: fade 0.15s linear forwards;
}

@keyframes fade {
  to {
    opacity: 0;
  }
}

.aim__line {
  fill: none;
  stroke: color-mix(in srgb, var(--color-text) 70%, transparent);
  stroke-width: 0.09;
  stroke-linecap: round;
  stroke-dasharray: 0.01 0.28;
}

.aim__landing {
  fill: none;
  stroke: color-mix(in srgb, var(--color-text) 60%, transparent);
  stroke-width: 0.05;
  stroke-dasharray: 0.15 0.1;
}

.shooter__base {
  fill: color-mix(in srgb, var(--game-bubbles) 22%, var(--color-surface));
  stroke: color-mix(in srgb, var(--game-bubbles) 45%, var(--color-surface));
  stroke-width: 0.05;
}

.shooter__nub {
  stroke: color-mix(in srgb, var(--game-bubbles) 70%, var(--color-text));
  stroke-width: 0.16;
  stroke-linecap: round;
}

.swap {
  position: absolute;
  aspect-ratio: 1;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
}

</style>
