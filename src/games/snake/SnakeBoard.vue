<script setup lang="ts">
import { computed, onBeforeUnmount, useId } from 'vue'

import { createTouchGuard } from '@/core/touchGuard'
import { t } from '@/core/i18n'
import { motionEnabled } from '@/core/theme'
import type { Direction } from './logic/types'

/**
 * The board: a checkered field, stones, the fruit and the snake as one rounded path through
 * its segments. Between two steps the head and the tail end glide along that path
 * (`progress` from the loop); with reduced motion the snake moves cell by cell.
 *
 * Input: a swipe turns as soon as it is long enough (not on lift), and keeps turning when
 * the finger changes direction; a tap without a swipe emits `tap` (start / continue).
 */
const props = defineProps<{
  size: number
  /** Cells, head first. */
  body: readonly number[]
  /** The tail cell given up by the last step (`null` after growing). */
  leftTail: number | null
  /** 0…1 between the last step and the next. */
  progress: number
  direction: Direction
  food: number
  stones: readonly number[]
  /** Open mode: the snake passes through the border. */
  wrap: boolean
  dead: boolean
}>()

const emit = defineEmits<{ turn: [direction: Direction]; tap: []; multitouch: [] }>()

const patternId = `snake-grid-${useId()}`

/** Minimum swipe distance in px (on the dominant axis). */
const SWIPE_THRESHOLD = 18
/** While the finger moves, one axis must clearly dominate (a curved thumb starts diagonally). */
const DOMINANCE = 1.4

type Point = [number, number]

const centre = (cell: number): Point => [(cell % props.size) + 0.5, Math.floor(cell / props.size) + 0.5]

/** One step from cell `a` to its neighbour `b` as a vector – across the border too (open mode). */
function stepVector(a: number, b: number): Point {
  const size = props.size
  let dx = (b % size) - (a % size)
  let dy = Math.floor(b / size) - Math.floor(a / size)
  if (dx > 1) dx -= size
  if (dx < -1) dx += size
  if (dy > 1) dy -= size
  if (dy < -1) dy += size
  return [dx, dy]
}

const shownProgress = computed(() => (motionEnabled.value ? props.progress : 1))

/**
 * The snake as one continuous line, head first, in "unrolled" board coordinates: a snake
 * passing through the border (open mode) simply continues beyond the edge. The head and the
 * tail end glide between two cells by `progress` (the drawing is one step behind the engine).
 */
const line = computed<Point[]>(() => {
  const body = props.body
  const f = shownProgress.value
  const head = centre(body[0]!)
  const points: Point[] = []
  if (body.length > 1) {
    const [dx, dy] = stepVector(body[1]!, body[0]!)
    points.push([head[0] - dx * (1 - f), head[1] - dy * (1 - f)])
  } else {
    points.push(head)
  }
  let [x, y] = head
  for (let i = 1; i < body.length; i++) {
    const [dx, dy] = stepVector(body[i]!, body[i - 1]!)
    x -= dx
    y -= dy
    points.push([x, y])
  }
  if (props.leftTail !== null && f < 1) {
    const [dx, dy] = stepVector(props.leftTail, body[body.length - 1]!)
    points.push([x - dx * (1 - f), y - dy * (1 - f)])
  }
  return points
})

/**
 * Where the line is drawn: on the board, and – where it runs over an edge – once more shifted
 * by the board size, so the part beyond the edge appears on the other side (the SVG clips the
 * rest).
 */
const copies = computed<Point[]>(() => {
  const size = props.size
  const xs = line.value.map((point) => point[0])
  const ys = line.value.map((point) => point[1])
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  const result: Point[] = []
  for (const ox of [-size, 0, size]) {
    for (const oy of [-size, 0, size]) {
      // The line is 0.8 wide: a copy within half a cell of the board can show.
      const margin = 0.5
      if (maxX + ox > -margin && minX + ox < size + margin && maxY + oy > -margin && minY + oy < size + margin) {
        result.push([ox, oy])
      }
    }
  }
  return result
})

const path = computed(() =>
  copies.value
    .map(([ox, oy]) =>
      line.value.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${(x + ox).toFixed(3)} ${(y + oy).toFixed(3)}`).join(''),
    )
    .join(''),
)

/** Heads that are (partly) on the board – two while the head passes through the border. */
const heads = computed(() => {
  const [hx, hy] = line.value[0]!
  const forward: Record<Direction, Point> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }
  const [fx, fy] = forward[props.direction]
  const side: Point = [-fy, fx]
  return copies.value
    .map(([ox, oy]): Point => [hx + ox, hy + oy])
    .filter(([x, y]) => x > -0.5 && x < props.size + 0.5 && y > -0.5 && y < props.size + 0.5)
    .map(([x, y]) => ({
      x,
      y,
      // Eyes look the way the snake moves.
      eyes: [1, -1].map((s) => ({
        x: x + fx * 0.12 + side[0] * 0.2 * s,
        y: y + fy * 0.12 + side[1] * 0.2 * s,
        px: x + fx * 0.18 + side[0] * 0.2 * s,
        py: y + fy * 0.18 + side[1] * 0.2 * s,
      })),
    }))
})

const foodPoint = computed(() => (props.food >= 0 ? centre(props.food) : null))
const stonePoints = computed(() => props.stones.map(centre))

// --- Swipe and tap ------------------------------------------------------------------

/** A second finger (pinch to zoom) never turns the snake: it pauses the game. */
const touches = createTouchGuard()

let start: { id: number; x: number; y: number; turned: boolean } | null = null

function onPointerDown(event: PointerEvent): void {
  if (!touches.down(event)) {
    stopTracking()
    emit('multitouch')
    return
  }
  if (event.pointerType === 'mouse' && event.button !== 0) return
  start = { id: event.pointerId, x: event.clientX, y: event.clientY, turned: false }
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerCancel)
}

/** The direction of a movement, or `null` when it is too short or (with `ratio`) too diagonal. */
function directionOf(dx: number, dy: number, ratio = 1): Direction | null {
  const [ax, ay] = [Math.abs(dx), Math.abs(dy)]
  if (Math.max(ax, ay) < SWIPE_THRESHOLD) return null
  if (ax >= ay * ratio) return dx > 0 ? 'right' : 'left'
  if (ay >= ax * ratio) return dy > 0 ? 'down' : 'up'
  return null
}

function onPointerMove(event: PointerEvent): void {
  if (!start || event.pointerId !== start.id || touches.multi) return
  const direction = directionOf(event.clientX - start.x, event.clientY - start.y, DOMINANCE)
  if (!direction) return
  emit('turn', direction)
  // Measure the next turn from here: one long swipe can turn twice ("up, then left").
  start = { ...start, x: event.clientX, y: event.clientY, turned: true }
}

function stopTracking(): void {
  start = null
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerCancel)
}

function onPointerUp(event: PointerEvent): void {
  touches.up(event)
  if (!start || event.pointerId !== start.id) return
  const { x, y, turned } = start
  const multi = touches.multi
  stopTracking()
  if (multi) return
  // A quick flick may end before a move event crossed the threshold: judge it on release.
  const direction = directionOf(event.clientX - x, event.clientY - y)
  if (direction) emit('turn', direction)
  else if (!turned) emit('tap')
}

function onPointerCancel(event: PointerEvent): void {
  touches.up(event)
  stopTracking()
}

onBeforeUnmount(stopTracking)
</script>

<template>
  <div
    class="snake-board no-select"
    :class="{ 'snake-board--wrap': wrap, 'snake-board--dead': dead }"
    @pointerdown="onPointerDown"
    @contextmenu.prevent
  >
    <svg :viewBox="`0 0 ${size} ${size}`" role="img" :aria-label="t('snake.play.board')">
      <defs>
        <pattern :id="patternId" width="2" height="2" patternUnits="userSpaceOnUse">
          <rect width="1" height="1" class="grid-cell" />
          <rect x="1" y="1" width="1" height="1" class="grid-cell" />
        </pattern>
      </defs>
      <rect :width="size" :height="size" class="field" />
      <rect :width="size" :height="size" :fill="`url(#${patternId})`" />

      <rect
        v-for="([x, y], i) in stonePoints"
        :key="`s${i}`"
        class="stone"
        :x="x - 0.45"
        :y="y - 0.45"
        width="0.9"
        height="0.9"
        rx="0.22"
      />

      <g v-if="foodPoint" :key="food" class="food" :transform="`translate(${foodPoint[0]} ${foodPoint[1]})`">
        <g class="food__inner">
          <path class="food__leaf" d="M0.02 -0.3 C0.1 -0.48 0.3 -0.5 0.36 -0.42 C0.28 -0.3 0.12 -0.28 0.02 -0.3 Z" />
          <circle class="food__fruit" r="0.33" cy="0.04" />
          <circle class="food__shine" r="0.08" cx="-0.12" cy="-0.08" />
        </g>
      </g>

      <g class="snake">
        <path class="snake__body" :d="path" />
        <path class="snake__stripe" :d="path" />
        <g v-for="(head, h) in heads" :key="h">
          <circle class="snake__head" :cx="head.x" :cy="head.y" r="0.47" />
          <g v-for="(eye, i) in head.eyes" :key="i">
            <circle class="snake__eye" :cx="eye.x" :cy="eye.y" r="0.13" />
            <circle class="snake__pupil" :cx="eye.px" :cy="eye.py" r="0.065" />
          </g>
        </g>
      </g>

      <rect class="border" x="0.04" y="0.04" :width="size - 0.08" :height="size - 0.08" />
    </svg>
  </div>
</template>

<style scoped>
.snake-board {
  --snake: var(--game-snake);
  --fruit: #d83a2f;
  --leaf: #3f8f2f;

  width: 100%;
  aspect-ratio: 1;
  /* Two-finger zoom stays possible (low vision); one finger never scrolls the page. */
  touch-action: pinch-zoom;
  box-shadow: var(--shadow-sm);
  cursor: pointer;
}

:root[data-theme='dark'] .snake-board {
  --fruit: #ff6b5e;
  --leaf: #7ccf5c;
}

svg {
  display: block;
  /* The snake passing through the border is drawn beyond the edge: cut it off there. */
  overflow: hidden;
  width: 100%;
  height: 100%;
}

.field {
  fill: var(--color-surface);
}

.grid-cell {
  fill: color-mix(in srgb, var(--snake) 7%, transparent);
}

.stone {
  fill: color-mix(in srgb, var(--color-text) 55%, var(--color-surface));
  stroke: color-mix(in srgb, var(--color-text) 75%, var(--color-surface));
  stroke-width: 0.06;
}

.border {
  fill: none;
  stroke: color-mix(in srgb, var(--snake) 70%, var(--color-text));
  stroke-width: 0.08;
}

/* Open mode: the border is a dashed line – the snake passes through it. */
.snake-board--wrap .border {
  stroke-dasharray: 0.35 0.25;
  stroke-opacity: 0.6;
}

.food__fruit {
  fill: var(--fruit);
}

.food__leaf {
  fill: var(--leaf);
}

.food__shine {
  fill: #fff;
  opacity: 0.7;
}

.snake__body {
  fill: none;
  stroke: var(--snake);
  stroke-width: 0.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* A lighter back stripe: the body reads as one band even where it touches itself. */
.snake__stripe {
  fill: none;
  stroke: color-mix(in srgb, var(--snake) 55%, #fff);
  stroke-width: 0.22;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0.55;
}

.snake__head {
  fill: color-mix(in srgb, var(--snake) 82%, var(--color-text));
}

.snake__eye {
  fill: #fff;
}

.snake__pupil {
  fill: #15141b;
}

/* Motion: fruit grows in; the snake blinks twice when it dies (2 flashes, < 3 per second). */
:root[data-motion='full'] .food__inner {
  animation: food-in var(--dur-med) ease-out both;
}

:root[data-motion='full'] .snake-board--dead .snake {
  animation: snake-blink 0.4s ease-in-out 2;
}

@keyframes food-in {
  from {
    transform: scale(0.2);
    opacity: 0;
  }
}

@keyframes snake-blink {
  50% {
    opacity: 0.25;
  }
}
</style>
