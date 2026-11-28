<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'

import { t } from '@/core/i18n'
import { ParticleLayer, rand, type ParticleInit } from '@/core/particles'
import { pickRandom as pick } from '@/core/rng'
import { motionEnabled } from '@/core/theme'
import { createTouchGuard } from '@/core/touchGuard'
import BubbleArt from './BubbleArt.vue'
import BubbleDefs from './BubbleDefs.vue'
import { COLOR_KEYS, ORB_COLORS } from './colors'
import { BOARD_HEIGHT, CELLS, centre, COLS, DANGER_Y, isCell, RADIUS, SHOOTER_X, SHOOTER_Y, type Parity, type Point } from './logic/grid'
import { angleTowards, trace } from './logic/trace'
import { BOMB, EMPTY, isColor, RAINBOW, STONE, type Shot } from './logic/types'
import type { AimLine } from './settings'

/**
 * The field as a holo panel: energy orbs in their hex grid, glowing side walls (the bounce
 * rails), a laser at the danger line and a turret with the current orb in its chamber and the
 * next one in a pod beside it.
 *
 * Input: press anywhere on the field and drag to aim – the turret turns and a laser sight
 * shows the real flight (the same `trace` as the shot) – and let go to shoot. Dragging back
 * below the turret cancels. The pod is a button: tap it to swap.
 *
 * Animation: a shot flies with a comet tail (`flight`) and `landed` fires at the end; popped
 * orbs flare and burst into sparks, falling ones drop, a bomb sends a shockwave (`ghosts`),
 * a new row slides in (`pushKey`). With reduced motion the flight is faster, there are no
 * particles, and pops and falls simply fade.
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
  /** `blast`: the shockwave of a bomb. */
  kind: 'pop' | 'fall' | 'blast'
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

const ids = `bubbles-${useId()}`

const NEXT: Point = { x: SHOOTER_X + 2.25, y: SHOOTER_Y + 0.28 }
/** Flight speed in bubble diameters per second. */
const SPEED = 30
const SPEED_REDUCED = 70
/** The `short` aim line ends after this length. */
const SHORT_LENGTH = 3.2
/** Points of the comet tail behind a flying orb. */
const TAIL = 7

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

/** Glow colour of a shot (aim laser, tail, chamber). */
function glowOf(shot: Shot): string {
  if (isColor(shot)) return ORB_COLORS[shot]!.main
  if (shot === BOMB) return '#ff5a3c'
  return '#ffffff'
}

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

/** Wall bounces on the aim line (small flashes on the rails). */
const bounces = computed(() => (props.aimMode === 'short' ? [] : aim.value.points.slice(1, -1)))

const landing = computed(() =>
  props.aimMode === 'full' && aim.value.cell >= 0 ? centre(aim.value.cell, props.parity) : null,
)

const aimGlow = computed(() => glowOf(props.current))

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

/** Dragged back below the turret: let go there to cancel. */
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

// --- Turret --------------------------------------------------------------------------

/** The barrel turns with the aim (rotation from "straight up"). */
const barrel = computed(() => `rotate(${(90 - angle.value).toFixed(2)} ${SHOOTER_X} ${SHOOTER_Y})`)
const recoil = ref(0)

// --- Flight --------------------------------------------------------------------------

const flyingAt = ref<Point | null>(null)
const tail = ref<Point[]>([])
let frame = 0

watch(
  () => props.flight,
  (flight) => {
    cancelAnimationFrame(frame)
    if (!flight) {
      flyingAt.value = null
      tail.value = []
      return
    }
    recoil.value++
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
      const at = { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }
      flyingAt.value = at
      if (motionEnabled.value) tail.value = [at, ...tail.value].slice(0, TAIL)
      if (travelled >= total) {
        flyingAt.value = null
        tail.value = []
        emit('landed', flight.id)
        return
      }
      frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
  },
)

// --- Particles -----------------------------------------------------------------------

const canvas = ref<HTMLCanvasElement | null>(null)
let layer: ParticleLayer | null = null
const burst = new Set<number>()
const timers = new Set<ReturnType<typeof setTimeout>>()

const SPARKS = ['#ffffff', '#c9f6ff', '#7ff0ff']

function particlesFor(ghost: Ghost, x: number, y: number, unit: number): ParticleInit[] {
  const list: ParticleInit[] = []
  const radial = (min: number, max: number) => {
    const a = Math.random() * Math.PI * 2
    const s = rand(min, max) * unit
    return { vx: Math.cos(a) * s, vy: Math.sin(a) * s }
  }
  if (ghost.kind === 'blast') {
    for (let i = 0; i < 34; i++) {
      list.push({ shape: 'spark', x, y, ...radial(5, 12), drag: 0.2, size: rand(0.06, 0.1) * unit, life: rand(0.4, 0.7), color: pick(['#ffffff', '#ffe066', '#ff9a1f', '#ff4a2f']) })
    }
    list.push({ shape: 'ring', x, y, size: 1.6 * unit, life: 0.5, color: '#ffb36b' })
    list.push({ shape: 'ring', x, y, size: 1.0 * unit, life: 0.4, color: '#ffffff' })
    return list
  }
  if (ghost.kind === 'fall') {
    list.push({ shape: 'spark', x, y, vx: 0, vy: 3 * unit, drag: 0.6, size: 0.05 * unit, life: 0.35, color: isColor(ghost.value) ? ORB_COLORS[ghost.value]!.light : '#d8d0c8' })
    return list
  }
  const palette = isColor(ghost.value) ? ORB_COLORS[ghost.value]! : { main: '#b9aea4', light: '#e8e0d8' }
  for (let i = 0; i < 9; i++) {
    list.push({ shape: 'spark', x, y, ...radial(2.5, 6.5), drag: 0.18, size: rand(0.05, 0.09) * unit, life: rand(0.35, 0.6), color: i % 3 === 0 ? palette.light : palette.main })
  }
  list.push({ shape: 'star', x: x + rand(-0.2, 0.2) * unit, y: y + rand(-0.2, 0.2) * unit, vy: -rand(0.4, 1) * unit, drag: 0.3, size: rand(0.14, 0.22) * unit, life: rand(0.4, 0.6), spin: rand(-5, 5), color: pick(SPARKS) })
  list.push({ shape: 'ring', x, y, size: 0.6 * unit, life: 0.35, color: palette.light })
  return list
}

watch(
  () => props.ghosts,
  (ghosts) => {
    const live = new Set(ghosts.map((g) => g.id))
    for (const id of burst) if (!live.has(id)) burst.delete(id)
    const fresh = ghosts.filter((g) => !burst.has(g.id))
    if (fresh.length === 0 || !layer || !motionEnabled.value) return
    fresh.forEach((g) => burst.add(g.id))
    const svg = root.value?.querySelector('svg')
    if (!svg || !canvas.value) return
    const canvasRect = canvas.value.getBoundingClientRect()
    if (Math.abs(canvasRect.width * Math.min(2, devicePixelRatio || 1) - canvas.value.width) > 2) layer.resize()
    const rect = svg.getBoundingClientRect()
    const unit = rect.width / COLS
    for (const ghost of fresh) {
      const x = rect.left - canvasRect.left + ghost.x * unit
      const y = rect.top - canvasRect.top + ghost.y * unit
      const timer = setTimeout(() => {
        timers.delete(timer)
        layer?.spawn(particlesFor(ghost, x, y, unit))
      }, ghost.delay)
      timers.add(timer)
    }
  },
)

function onResize(): void {
  layer?.resize()
}

onMounted(() => {
  if (canvas.value) layer = new ParticleLayer(canvas.value)
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  for (const timer of timers) clearTimeout(timer)
  layer?.destroy()
  window.removeEventListener('resize', onResize)
  stop()
})

// --- Labels --------------------------------------------------------------------------

function bubbleName(shot: Shot): string {
  if (isColor(shot)) return t(`bubbles.colorNames.${COLOR_KEYS[shot]!}`)
  if (shot === BOMB) return t('bubbles.play.special.bomb')
  if (shot === RAINBOW) return t('bubbles.play.special.rainbow')
  if (shot === STONE) return t('bubbles.play.special.stone')
  return ''
}

const nextStyle = {
  left: `${((NEXT.x - 0.65) / COLS) * 100}%`,
  top: `${((NEXT.y - 0.65) / BOARD_HEIGHT) * 100}%`,
  width: `${(1.3 / COLS) * 100}%`,
}

const HEX_W = 0.6
const HEX_H = HEX_W * Math.sqrt(3)
</script>

<template>
  <div
    ref="root"
    class="bubbles-board no-select"
    :class="{ 'bubbles-board--aiming': dragging, 'bubbles-board--locked': locked, 'bubbles-board--danger': danger }"
    :style="{ aspectRatio: `${COLS} / ${BOARD_HEIGHT}` }"
    @pointerdown="onPointerDown"
    @contextmenu.prevent
  >
    <span class="corner corner--tl" /><span class="corner corner--tr" /><span class="corner corner--bl" /><span class="corner corner--br" />
    <svg :viewBox="`0 0 ${COLS} ${BOARD_HEIGHT.toFixed(3)}`" role="img" :aria-label="t('bubbles.play.board')">
      <BubbleDefs :ids="ids" />
      <defs>
        <linearGradient :id="`${ids}-panel`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#0b1233" />
          <stop offset="0.65" stop-color="#070b24" />
          <stop offset="1" stop-color="#110a2e" />
        </linearGradient>
        <pattern :id="`${ids}-hex`" :width="HEX_W * 3" :height="HEX_H" patternUnits="userSpaceOnUse">
          <path
            class="panel__hex"
            :d="`M0 ${HEX_H / 2} L${HEX_W / 2} 0 H${HEX_W * 1.5} L${HEX_W * 2} ${HEX_H / 2} L${HEX_W * 1.5} ${HEX_H} H${HEX_W / 2} Z M${HEX_W * 2} ${HEX_H / 2} H${HEX_W * 3}`"
          />
        </pattern>
        <pattern :id="`${ids}-scan`" width="1" height="0.16" patternUnits="userSpaceOnUse">
          <rect width="1" height="0.05" fill="#7ff6ff" opacity="0.035" />
        </pattern>
        <radialGradient :id="`${ids}-vignette`" cx="0.5" cy="0.45" r="0.75">
          <stop offset="0.6" stop-color="#000" stop-opacity="0" />
          <stop offset="1" stop-color="#000" stop-opacity="0.45" />
        </radialGradient>
        <linearGradient :id="`${ids}-metal`" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#3b4470" />
          <stop offset="0.45" stop-color="#a9b6e8" />
          <stop offset="0.6" stop-color="#6b78b0" />
          <stop offset="1" stop-color="#262c4d" />
        </linearGradient>
        <linearGradient :id="`${ids}-dome`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#5b67a3" />
          <stop offset="1" stop-color="#1a1f3d" />
        </linearGradient>
      </defs>

      <!-- Panel: dark glass, honeycomb, scanlines, glowing rails at the walls. -->
      <rect :width="COLS" :height="BOARD_HEIGHT" :fill="`url(#${ids}-panel)`" />
      <rect :width="COLS" :height="BOARD_HEIGHT" :fill="`url(#${ids}-hex)`" />
      <rect :width="COLS" :height="BOARD_HEIGHT" :fill="`url(#${ids}-scan)`" />
      <rect :width="COLS" :height="BOARD_HEIGHT" :fill="`url(#${ids}-vignette)`" />
      <line class="rail rail--glow" x1="0.03" y1="0" x2="0.03" :y2="DANGER_Y" />
      <line class="rail rail--glow" :x1="COLS - 0.03" y1="0" :x2="COLS - 0.03" :y2="DANGER_Y" />
      <line class="rail" x1="0.03" y1="0" x2="0.03" :y2="DANGER_Y" />
      <line class="rail" :x1="COLS - 0.03" y1="0" :x2="COLS - 0.03" :y2="DANGER_Y" />
      <rect class="ceiling" x="0" y="-0.02" :width="COLS" height="0.1" />

      <!-- Danger laser with its emitters. -->
      <g class="laser" :class="{ 'laser--hot': danger }">
        <line class="laser__glow" x1="0.25" :x2="COLS - 0.25" :y1="DANGER_Y" :y2="DANGER_Y" />
        <line class="laser__beam" x1="0.25" :x2="COLS - 0.25" :y1="DANGER_Y" :y2="DANGER_Y" />
        <rect class="laser__emitter" x="0" :y="DANGER_Y - 0.14" width="0.3" height="0.28" rx="0.05" />
        <rect class="laser__emitter" :x="COLS - 0.3" :y="DANGER_Y - 0.14" width="0.3" height="0.28" rx="0.05" />
      </g>

      <g :key="pushKey" class="bubbles" :class="{ 'bubbles--pushed': pushKey > 0 }">
        <BubbleArt
          v-for="b in bubbles"
          :key="b.cell"
          :value="b.value"
          :x="b.x"
          :y="b.y"
          :marked="b.marked"
          :symbols="symbols"
          :ids="ids"
        />
      </g>

      <g class="ghosts">
        <template v-for="g in ghosts" :key="g.id">
          <g v-if="g.kind === 'blast'" class="shock" :style="{ animationDelay: `${g.delay}ms` }">
            <circle :cx="g.x" :cy="g.y" r="1.6" class="shock__ring" />
          </g>
          <g v-else :class="`ghost ghost--${g.kind}`" :style="{ animationDelay: `${g.delay}ms` }">
            <BubbleArt :value="g.value" :x="g.x" :y="g.y" :symbols="symbols" :ids="ids" />
          </g>
        </template>
      </g>

      <g v-if="aimShown && !cancelling" class="aim" :style="{ '--glow': aimGlow }">
        <path class="aim__glow" :d="aimPath" />
        <path class="aim__beam" :d="aimPath" />
        <circle v-for="(p, i) in bounces" :key="i" class="aim__bounce" :cx="p.x" :cy="p.y" r="0.12" />
        <g v-if="landing" class="aim__landing">
          <circle :cx="landing.x" :cy="landing.y" r="0.46" class="aim__ghost" />
          <circle :cx="landing.x" :cy="landing.y" r="0.08" class="aim__dot" />
        </g>
      </g>

      <!-- Turret: platform, barrel (turns with the aim), chamber with the current orb. -->
      <g class="turret" :style="{ '--glow': aimGlow }">
        <path class="turret__deck" :d="`M0 ${BOARD_HEIGHT} V${SHOOTER_Y + 0.62} H${COLS} V${BOARD_HEIGHT} Z`" />
        <path class="turret__deck-line" :d="`M0 ${SHOOTER_Y + 0.62} H${COLS}`" />
        <path
          class="turret__dome"
          :d="`M${SHOOTER_X - 1.55} ${BOARD_HEIGHT} A1.55 1.25 0 0 1 ${SHOOTER_X + 1.55} ${BOARD_HEIGHT} Z`"
          :fill="`url(#${ids}-dome)`"
        />
        <path
          class="turret__band"
          :d="`M${SHOOTER_X - 1.3} ${BOARD_HEIGHT - 0.02} A1.3 1.02 0 0 1 ${SHOOTER_X + 1.3} ${BOARD_HEIGHT - 0.02}`"
        />
        <circle v-for="dx in [-0.95, 0, 0.95]" :key="dx" class="turret__light" :cx="SHOOTER_X + dx" :cy="BOARD_HEIGHT - (dx === 0 ? 0.22 : 0.3)" r="0.06" />
        <g :key="recoil" :transform="barrel" class="turret__barrel" :class="{ 'turret__barrel--fired': recoil > 0 }">
          <path
            class="turret__fin"
            :d="`M${SHOOTER_X - 0.36} ${SHOOTER_Y - 0.55} L${SHOOTER_X - 0.62} ${SHOOTER_Y - 0.25} L${SHOOTER_X - 0.36} ${SHOOTER_Y - 0.2} Z M${SHOOTER_X + 0.36} ${SHOOTER_Y - 0.55} L${SHOOTER_X + 0.62} ${SHOOTER_Y - 0.25} L${SHOOTER_X + 0.36} ${SHOOTER_Y - 0.2} Z`"
          />
          <path
            :d="`M${SHOOTER_X - 0.4} ${SHOOTER_Y - 0.1} L${SHOOTER_X - 0.27} ${SHOOTER_Y - 1.42} H${SHOOTER_X + 0.27} L${SHOOTER_X + 0.4} ${SHOOTER_Y - 0.1} Z`"
            :fill="`url(#${ids}-metal)`"
            class="turret__body"
          />
          <rect :x="SHOOTER_X - 0.34" :y="SHOOTER_Y - 1.56" width="0.68" height="0.24" rx="0.06" class="turret__muzzle" />
          <rect :x="SHOOTER_X - 0.17" :y="SHOOTER_Y - 1.3" width="0.07" height="0.9" rx="0.035" class="turret__stripe" />
          <rect :x="SHOOTER_X + 0.1" :y="SHOOTER_Y - 1.3" width="0.07" height="0.9" rx="0.035" class="turret__stripe" />
        </g>
        <circle :cx="SHOOTER_X" :cy="SHOOTER_Y" r="0.62" class="turret__chamber" />
        <circle :cx="SHOOTER_X" :cy="SHOOTER_Y" r="0.62" class="turret__chamber-ring" />
        <circle :cx="SHOOTER_X" :cy="SHOOTER_Y" r="0.72" class="turret__ticks" />
        <BubbleArt v-if="!flight" :value="current" :x="SHOOTER_X" :y="SHOOTER_Y" :symbols="symbols" :ids="ids" />

        <!-- The pod with the next orb. -->
        <g class="pod">
          <circle :cx="NEXT.x" :cy="NEXT.y" r="0.5" class="pod__shell" />
          <circle :cx="NEXT.x" :cy="NEXT.y" r="0.5" class="pod__ring" />
          <g :transform="`translate(${NEXT.x} ${NEXT.y}) scale(0.74) translate(${-NEXT.x} ${-NEXT.y})`">
            <BubbleArt :value="next" :x="NEXT.x" :y="NEXT.y" :symbols="symbols" :ids="ids" :halo="false" />
          </g>
          <path
            class="pod__swap"
            :d="`M${NEXT.x - 0.95} ${NEXT.y - 0.12} q0.2 -0.22 0.42 0 m0 0 l-0.1 -0.08 m0.1 0.08 l-0.12 0.04 M${NEXT.x - 0.53} ${NEXT.y + 0.12} q-0.2 0.22 -0.42 0 m0 0 l0.1 0.08 m-0.1 -0.08 l0.12 -0.04`"
          />
        </g>
      </g>

      <g v-if="flyingAt && flight" class="flying" :style="{ '--glow': glowOf(flight.value) }">
        <circle
          v-for="(p, i) in tail"
          :key="i"
          class="flying__tail"
          :cx="p.x"
          :cy="p.y"
          :r="0.42 * (1 - i / TAIL)"
          :opacity="0.42 * (1 - i / TAIL)"
        />
        <BubbleArt :value="flight.value" :x="flyingAt.x" :y="flyingAt.y" :symbols="symbols" :ids="ids" />
      </g>
    </svg>
    <canvas ref="canvas" class="particles" aria-hidden="true" />
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
  --neon: #4ff3ff;

  position: relative;
  width: 100%;
  border: 2px solid color-mix(in srgb, var(--neon) 70%, transparent);
  background: #070b24;
  box-shadow:
    0 0 0 1px rgb(0 0 0 / 60%),
    0 0 18px color-mix(in srgb, var(--neon) 45%, transparent),
    inset 0 0 22px color-mix(in srgb, var(--neon) 25%, transparent),
    0 12px 30px rgb(0 0 0 / 45%);
  touch-action: none;
  cursor: crosshair;
  transition: box-shadow var(--dur-med) ease;
}

.bubbles-board--danger {
  --neon: #ff4d6d;
}

.bubbles-board--locked {
  cursor: default;
}

/* Corner brackets of the holo frame. */
.corner {
  position: absolute;
  z-index: 1;
  width: 18px;
  height: 18px;
  border: 3px solid var(--neon);
  filter: drop-shadow(0 0 4px var(--neon));
  pointer-events: none;
}

.corner--tl {
  top: -6px;
  left: -6px;
  border-right: none;
  border-bottom: none;
}

.corner--tr {
  top: -6px;
  right: -6px;
  border-left: none;
  border-bottom: none;
}

.corner--bl {
  bottom: -6px;
  left: -6px;
  border-right: none;
  border-top: none;
}

.corner--br {
  right: -6px;
  bottom: -6px;
  border-left: none;
  border-top: none;
}

svg {
  display: block;
  width: 100%;
  height: 100%;
}

.particles {
  position: absolute;
  inset: -40px;
  z-index: var(--z-board-fx);
  width: calc(100% + 80px);
  height: calc(100% + 80px);
  pointer-events: none;
}

:root[data-motion='reduced'] .particles {
  display: none;
}

.panel__hex {
  fill: none;
  stroke: #4ff3ff;
  stroke-opacity: 0.07;
  stroke-width: 0.02;
}

.rail {
  stroke: #9ffaff;
  stroke-width: 0.04;
}

.rail--glow {
  stroke: #4ff3ff;
  stroke-width: 0.18;
  stroke-opacity: 0.35;
}

.ceiling {
  fill: #4ff3ff;
  opacity: 0.45;
}

.laser__glow {
  stroke: #ff3b5c;
  stroke-width: 0.2;
  stroke-opacity: 0.25;
}

.laser__beam {
  stroke: #ff7a8f;
  stroke-width: 0.035;
  stroke-dasharray: 0.3 0.12;
}

.laser__emitter {
  fill: #2a2f55;
  stroke: #ff7a8f;
  stroke-width: 0.03;
}

/* Close to the line: the laser flares up and pulses twice (≤ 3 flashes per second). */
.laser--hot .laser__glow {
  stroke-width: 0.34;
  stroke-opacity: 0.55;
  animation: warn 0.5s ease-in-out 4 alternate;
}

.laser--hot .laser__beam {
  stroke: #fff;
  stroke-dasharray: none;
}

@keyframes warn {
  to {
    stroke-opacity: 0.12;
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
  transform-box: fill-box;
  transform-origin: center;
  animation: pop 0.28s ease-out both;
}

.ghost--fall {
  animation: fall 0.75s cubic-bezier(0.5, 0, 1, 0.6) both;
}

.shock__ring {
  fill: none;
  stroke: #ffb36b;
  stroke-width: 0.12;
  transform-box: fill-box;
  transform-origin: center;
  animation: shock 0.45s ease-out both;
}

@keyframes pop {
  0% {
    transform: scale(1);
    filter: brightness(1);
  }

  40% {
    transform: scale(1.3);
    filter: brightness(2);
    opacity: 1;
  }

  100% {
    transform: scale(0.1);
    opacity: 0;
  }
}

@keyframes fall {
  to {
    transform: translateY(9px);
    opacity: 0;
  }
}

@keyframes shock {
  from {
    transform: scale(0.2);
    opacity: 1;
  }

  to {
    transform: scale(1.4);
    opacity: 0;
  }
}

:root[data-motion='reduced'] .laser--hot .laser__glow,
:root[data-motion='reduced'] .bubbles--pushed,
:root[data-motion='reduced'] .turret__barrel--fired,
:root[data-motion='reduced'] .turret__light,
:root[data-motion='reduced'] .turret__ticks,
:root[data-motion='reduced'] .aim__beam {
  animation: none;
}

:root[data-motion='reduced'] .ghost--pop,
:root[data-motion='reduced'] .ghost--fall {
  animation: fade 0.15s linear forwards;
}

:root[data-motion='reduced'] .shock {
  display: none;
}

@keyframes fade {
  to {
    opacity: 0;
  }
}

.aim__glow {
  fill: none;
  stroke: var(--glow);
  stroke-width: 0.2;
  stroke-opacity: 0.28;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.aim__beam {
  fill: none;
  stroke: #fff;
  stroke-width: 0.07;
  stroke-linecap: round;
  stroke-dasharray: 0.01 0.22;
  animation: march 0.6s linear infinite;
}

@keyframes march {
  to {
    stroke-dashoffset: -0.23;
  }
}

.aim__bounce {
  fill: #fff;
  stroke: var(--glow);
  stroke-width: 0.06;
}

.aim__ghost {
  fill: color-mix(in srgb, var(--glow) 18%, transparent);
  stroke: var(--glow);
  stroke-width: 0.05;
  stroke-dasharray: 0.14 0.08;
}

.aim__dot {
  fill: var(--glow);
}

.turret__deck {
  fill: rgb(20 26 60 / 85%);
}

.turret__deck-line {
  stroke: #4ff3ff;
  stroke-width: 0.03;
  stroke-opacity: 0.6;
}

.turret__dome {
  stroke: #8fa0e0;
  stroke-width: 0.04;
}

.turret__band {
  fill: none;
  stroke: #4ff3ff;
  stroke-width: 0.06;
  stroke-opacity: 0.8;
}

.turret__light {
  fill: #b6fbff;
  animation: lights 1.6s ease-in-out infinite alternate;
}

.turret__light:nth-of-type(2) {
  animation-delay: -0.8s;
}

@keyframes lights {
  to {
    fill: #2c6f8a;
  }
}

.turret__fin {
  fill: #2a3160;
  stroke: #6b78b0;
  stroke-width: 0.03;
}

.turret__body {
  stroke: #1c2142;
  stroke-width: 0.04;
}

.turret__ticks {
  fill: none;
  stroke: #4ff3ff;
  stroke-width: 0.05;
  stroke-dasharray: 0.06 0.19;
  stroke-opacity: 0.7;
  transform-box: fill-box;
  transform-origin: center;
  animation: ticks 8s linear infinite;
}

@keyframes ticks {
  to {
    transform: rotate(360deg);
  }
}

.turret__muzzle {
  fill: #1c2142;
  stroke: var(--glow);
  stroke-width: 0.05;
}

.turret__stripe {
  fill: var(--glow);
  opacity: 0.85;
}

.turret__barrel--fired {
  animation: recoil 0.18s ease-out;
}

@keyframes recoil {
  40% {
    translate: 0 0.12px;
  }
}

.turret__chamber {
  fill: #0d1230;
  stroke: #2f3769;
  stroke-width: 0.08;
}

.turret__chamber-ring {
  fill: none;
  stroke: var(--glow);
  stroke-width: 0.05;
  stroke-opacity: 0.85;
}

.pod__shell {
  fill: #0d1230;
}

.pod__ring {
  fill: none;
  stroke: #4ff3ff;
  stroke-width: 0.04;
  stroke-dasharray: 0.16 0.08;
}

.pod__swap {
  fill: none;
  stroke: #9ffaff;
  stroke-width: 0.045;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0.8;
}

.flying__tail {
  fill: var(--glow);
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
