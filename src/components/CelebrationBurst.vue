<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

import { ParticleLayer, rand, type ParticleInit } from '@/core/particles'
import { motionEnabled } from '@/core/theme'

/**
 * Full-screen particles for the end of a game, drawn on a canvas above dialogs (ignores
 * pointer input). Starts whenever `active` turns true; nothing happens with reduced motion.
 *
 * - `win`: two confetti cannons fire from the bottom corners, then confetti and stars rain down.
 * - `lose`: a short, soft shower of grey-blue rain – the game is over, better luck next time.
 */
const props = withDefaults(defineProps<{ active: boolean; mood?: 'win' | 'lose' }>(), {
  mood: 'win',
})

const COLORS = ['#f2263f', '#ff9412', '#ffd61f', '#2fbd4f', '#3584ff', '#a24bf5', '#ff6fc0', '#ffffff']
const DURATION_MS = 4200

const canvas = ref<HTMLCanvasElement | null>(null)
const running = ref(false)
let layer: ParticleLayer | null = null
let timers: ReturnType<typeof setTimeout>[] = []

const pick = <T,>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)]!

function cannon(fromLeft: boolean, width: number, height: number): ParticleInit[] {
  const list: ParticleInit[] = []
  const scale = Math.max(0.7, Math.min(1.4, height / 800))
  for (let i = 0; i < 70; i++) {
    // Up and towards the middle, with a wide spread.
    const angle = -rand(Math.PI * 0.28, Math.PI * 0.45)
    const speed = rand(700, 1350) * scale
    const vx = Math.cos(angle) * speed * (fromLeft ? 1 : -1)
    list.push({
      shape: i % 9 === 0 ? 'star' : 'confetti',
      x: fromLeft ? -10 : width + 10,
      y: height + 10,
      vx,
      vy: Math.sin(angle) * speed,
      gravity: 900 * scale,
      drag: 0.45,
      size: i % 9 === 0 ? rand(8, 12) : rand(8, 13),
      life: rand(2.2, 3.4),
      rot: rand(0, Math.PI * 2),
      spin: rand(-9, 9),
      color: pick(COLORS),
    })
  }
  return list
}

function rain(width: number): ParticleInit[] {
  const list: ParticleInit[] = []
  for (let i = 0; i < 50; i++) {
    list.push({
      shape: i % 10 === 0 ? 'star' : 'confetti',
      x: rand(0, width),
      y: rand(-60, -10),
      vx: rand(-40, 40),
      vy: rand(80, 200),
      gravity: 120,
      drag: 0.6,
      size: rand(7, 12),
      life: rand(2.6, 3.4),
      rot: rand(0, Math.PI * 2),
      spin: rand(-6, 6),
      color: pick(COLORS),
    })
  }
  return list
}

/** Slanted rain streaks falling from above the top edge. */
function shower(width: number, height: number, count: number): ParticleInit[] {
  const list: ParticleInit[] = []
  for (let i = 0; i < count; i++) {
    const speed = rand(0.9, 1.25) * height
    list.push({
      shape: 'spark',
      x: rand(-0.1, 1.1) * width,
      y: rand(-0.25, 0) * height,
      vx: -0.12 * speed,
      vy: speed,
      size: rand(1.6, 2.6),
      life: rand(0.9, 1.4),
      color: pick(['rgba(150,175,210,0.75)', 'rgba(120,145,185,0.7)', 'rgba(200,215,235,0.7)']),
    })
  }
  return list
}

function stop(): void {
  timers.forEach(clearTimeout)
  timers = []
  layer?.destroy()
  layer = null
  running.value = false
}

async function start(): Promise<void> {
  stop()
  if (!motionEnabled.value || typeof window === 'undefined') return
  running.value = true
  await nextTick()
  if (!canvas.value) return
  layer = new ParticleLayer(canvas.value)
  const width = window.innerWidth
  const height = window.innerHeight
  const fire = (delay: number, list: () => ParticleInit[]) =>
    timers.push(setTimeout(() => layer?.spawn(list()), delay))
  if (props.mood === 'lose') {
    for (let i = 0; i < 8; i++) fire(200 + i * 220, () => shower(width, height, i < 5 ? 26 : 14))
  } else {
    fire(120, () => [...cannon(true, width, height), ...cannon(false, width, height)])
    fire(650, () => rain(width))
    fire(1300, () => rain(width))
  }
  timers.push(setTimeout(stop, DURATION_MS))
}

watch(
  () => props.active,
  (active) => {
    if (active) void start()
    else stop()
  },
  { immediate: true },
)

onBeforeUnmount(stop)
</script>

<template>
  <Teleport to="body">
    <canvas v-if="running" ref="canvas" class="celebration" aria-hidden="true" />
  </Teleport>
</template>

<style scoped>
.celebration {
  position: fixed;
  inset: 0;
  z-index: 101;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
</style>
