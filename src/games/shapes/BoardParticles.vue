<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { ParticleLayer, rand, type ParticleInit } from '@/core/particles'
import { pickRandom as pick } from '@/core/rng'
import type { BoardEffect } from './animator'
import { SIZE, type Field } from './logic/types'

/**
 * Canvas particles for the board effects: juice drops and sparkles when pieces pop, spark
 * streaks along rocket lines, debris for bombs and rainbow stars for prisms.
 *
 * Place it inside the (positioned) board frame next to `.board`; the canvas reaches a bit
 * beyond the frame so particles can fly out of the board.
 */
const props = defineProps<{
  effects: BoardEffect[]
  /** Level obstacles: a crate, chain or target that disappears bursts into pieces. */
  field?: Field | null
  /** Only obstacles removed by a move burst (not when a new level replaces the field). */
  animating?: boolean
}>()

const canvas = ref<HTMLCanvasElement | null>(null)
let layer: ParticleLayer | null = null
const seen = new Set<number>()

/** Main and light colour per kind (match the piece gradients). */
const COLORS: Record<number, [string, string]> = {
  0: ['#ff3d57', '#ffc2ca'],
  1: ['#ff9412', '#ffd9a0'],
  2: ['#ffd61f', '#fff6b0'],
  3: ['#2fbd4f', '#b8f58a'],
  4: ['#3584ff', '#c4dcff'],
  5: ['#a24bf5', '#e7c4ff'],
}
const ITEM_COLORS: [string, string] = ['#d18a42', '#ffd29a']
const RAINBOW = ['#f2263f', '#ff9412', '#ffd61f', '#2fbd4f', '#3584ff', '#a24bf5', '#ffffff']
const SPARK = ['#ffffff', '#fff3a0', '#ffd23f', '#ffb020']


function radial(speedMin: number, speedMax: number): { vx: number; vy: number } {
  const a = Math.random() * Math.PI * 2
  const s = rand(speedMin, speedMax)
  return { vx: Math.cos(a) * s, vy: Math.sin(a) * s }
}

function particlesFor(effect: BoardEffect, x: number, y: number, cell: number): ParticleInit[] {
  const list: ParticleInit[] = []
  const [main, light] = COLORS[effect.kind] ?? ITEM_COLORS
  switch (effect.type) {
    case 'pop': {
      for (let i = 0; i < 9; i++) {
        list.push({
          shape: 'drop',
          x,
          y,
          ...radial(2.5 * cell, 5.5 * cell),
          gravity: 14 * cell,
          drag: 0.15,
          size: rand(0.06, 0.11) * cell,
          life: rand(0.45, 0.7),
          color: i % 3 === 0 ? light : main,
        })
      }
      for (let i = 0; i < 2; i++) {
        list.push({
          shape: 'star',
          x: x + rand(-0.3, 0.3) * cell,
          y: y + rand(-0.3, 0.3) * cell,
          vx: rand(-0.4, 0.4) * cell,
          vy: -rand(0.5, 1.2) * cell,
          drag: 0.3,
          size: rand(0.14, 0.22) * cell,
          life: rand(0.45, 0.65),
          spin: rand(-5, 5),
          color: pick(['#ffffff', '#fff3a0']),
        })
      }
      list.push({ shape: 'ring', x, y, size: 0.55 * cell, life: 0.35, color: light })
      break
    }
    case 'line-h':
    case 'line-v': {
      const horizontal = effect.type === 'line-h'
      for (let i = 0; i < 28; i++) {
        const dir = i % 2 ? 1 : -1
        const along = dir * rand(6, 14) * cell
        const across = rand(-1, 1) * cell
        list.push({
          shape: 'spark',
          x,
          y,
          vx: horizontal ? along : across,
          vy: horizontal ? across : along,
          drag: 0.35,
          size: rand(0.05, 0.08) * cell,
          life: rand(0.35, 0.55),
          color: pick(SPARK),
        })
      }
      for (let i = 0; i < SIZE; i++) {
        const offset = (i - (SIZE - 1) / 2) * cell
        list.push({
          shape: 'star',
          x: horizontal ? x + offset + rand(-0.3, 0.3) * cell : x + rand(-0.2, 0.2) * cell,
          y: horizontal ? y + rand(-0.2, 0.2) * cell : y + offset + rand(-0.3, 0.3) * cell,
          vy: -rand(0.2, 0.8) * cell,
          drag: 0.4,
          size: rand(0.12, 0.2) * cell,
          life: rand(0.4, 0.6),
          spin: rand(-6, 6),
          color: pick(SPARK),
        })
      }
      break
    }
    case 'burst': {
      for (let i = 0; i < 30; i++) {
        list.push({
          shape: 'spark',
          x,
          y,
          ...radial(4 * cell, 10 * cell),
          gravity: 4 * cell,
          drag: 0.2,
          size: rand(0.06, 0.1) * cell,
          life: rand(0.4, 0.65),
          color: pick(['#ffffff', '#ffe066', '#ff9a1f', '#ff5a1f']),
        })
      }
      for (let i = 0; i < 12; i++) {
        list.push({
          shape: 'drop',
          x,
          y,
          ...radial(3 * cell, 6 * cell),
          gravity: 12 * cell,
          drag: 0.25,
          size: rand(0.06, 0.12) * cell,
          life: rand(0.5, 0.8),
          color: pick([main, light, '#3a3f52']),
        })
      }
      list.push({ shape: 'ring', x, y, size: 1.6 * cell, life: 0.45, color: '#ffd36b' })
      list.push({ shape: 'ring', x, y, size: 1.1 * cell, life: 0.35, color: '#ffffff' })
      break
    }
    case 'prism': {
      for (let i = 0; i < 44; i++) {
        list.push({
          shape: 'star',
          x,
          y,
          ...radial(2 * cell, 8 * cell),
          gravity: 2 * cell,
          drag: 0.25,
          size: rand(0.12, 0.26) * cell,
          life: rand(0.6, 1),
          spin: rand(-8, 8),
          color: pick(RAINBOW),
        })
      }
      list.push({ shape: 'ring', x, y, size: 2.4 * cell, life: 0.6, color: '#ffffff' })
      break
    }
  }
  return list
}

type Obstacle = 'crate' | 'crate-hit' | 'chain' | 'target'

function obstacleParticles(type: Obstacle, x: number, y: number, cell: number): ParticleInit[] {
  const list: ParticleInit[] = []
  const scatter = (
    count: number,
    shape: ParticleInit['shape'],
    colors: readonly string[],
    speed: [number, number],
    size: [number, number],
    gravity: number,
  ) => {
    for (let i = 0; i < count; i++) {
      list.push({
        shape,
        x: x + rand(-0.25, 0.25) * cell,
        y: y + rand(-0.25, 0.25) * cell,
        ...radial(speed[0] * cell, speed[1] * cell),
        gravity: gravity * cell,
        drag: 0.3,
        size: rand(size[0], size[1]) * cell,
        life: rand(0.5, 0.85),
        rot: rand(0, Math.PI * 2),
        spin: rand(-12, 12),
        color: pick(colors),
      })
    }
  }
  switch (type) {
    case 'crate':
      scatter(14, 'confetti', ['#c07a35', '#9c5d24', '#d9994f', '#7a4518'], [2.5, 6], [0.18, 0.3], 12)
      scatter(8, 'drop', ['#d8c3a0', '#b89a70'], [1, 3], [0.05, 0.09], 4)
      break
    case 'crate-hit':
      scatter(10, 'spark', ['#ffffff', '#d7dde7', '#ffe066'], [4, 8], [0.04, 0.07], 6)
      scatter(5, 'confetti', ['#8d96a6', '#555d6c'], [2, 4], [0.14, 0.22], 12)
      break
    case 'chain':
      scatter(10, 'ring', ['#c3cad6', '#8d96a6'], [2, 5], [0.12, 0.2], 10)
      scatter(10, 'spark', ['#ffffff', '#ffd23f'], [4, 8], [0.04, 0.07], 4)
      scatter(3, 'star', ['#ffd23f', '#fff3a0'], [0.5, 1.5], [0.18, 0.25], 0)
      break
    case 'target':
      scatter(10, 'drop', ['#7a4d26', '#9a6a3e', '#55331a'], [2, 4.5], [0.06, 0.1], 12)
      scatter(8, 'confetti', ['#3cb850', '#7ee05a'], [1.5, 4], [0.14, 0.22], 6)
      scatter(4, 'star', ['#ffffff', '#ffd23f', '#ff9ad8'], [0.5, 1.5], [0.16, 0.24], -1)
      break
  }
  return list
}

/** Origin of the board in canvas coordinates and the cell size. */
function geometry(): { ox: number; oy: number; cell: number } | null {
  const el = canvas.value
  const board = el?.parentElement?.querySelector('.board')
  if (!el || !layer || !board) return null
  const canvasRect = el.getBoundingClientRect()
  if (Math.abs(canvasRect.width * Math.min(2, devicePixelRatio || 1) - el.width) > 2) layer.resize()
  const boardRect = board.getBoundingClientRect()
  return {
    ox: boardRect.left - canvasRect.left,
    oy: boardRect.top - canvasRect.top,
    cell: boardRect.width / SIZE,
  }
}

function onFieldChange(next: Field | null | undefined, prev: Field | null | undefined): void {
  if (!next || !prev || !props.animating) return
  const g = geometry()
  if (!g) return
  const list: ParticleInit[] = []
  for (let cell = 0; cell < SIZE * SIZE; cell++) {
    const x = g.ox + ((cell % SIZE) + 0.5) * g.cell
    const y = g.oy + (Math.floor(cell / SIZE) + 0.5) * g.cell
    const before = prev.crates[cell] ?? 0
    const after = next.crates[cell] ?? 0
    if (after < before) list.push(...obstacleParticles(after === 0 ? 'crate' : 'crate-hit', x, y, g.cell))
    if ((next.chains[cell] ?? 0) < (prev.chains[cell] ?? 0)) list.push(...obstacleParticles('chain', x, y, g.cell))
    if ((next.targets[cell] ?? 0) < (prev.targets[cell] ?? 0)) list.push(...obstacleParticles('target', x, y, g.cell))
  }
  layer?.spawn(list)
}

watch(() => props.field, onFieldChange)

function spawnNew(effects: BoardEffect[]): void {
  const el = canvas.value
  const board = el?.parentElement?.querySelector('.board')
  if (!el || !layer || !board) return
  const fresh = effects.filter((effect) => !seen.has(effect.id))
  if (fresh.length === 0) return
  fresh.forEach((effect) => seen.add(effect.id))
  // Forget ids that are gone (the list only holds the effects currently on screen).
  const live = new Set(effects.map((effect) => effect.id))
  for (const id of seen) if (!live.has(id)) seen.delete(id)

  const canvasRect = el.getBoundingClientRect()
  if (Math.abs(canvasRect.width * Math.min(2, devicePixelRatio || 1) - el.width) > 2) layer.resize()
  const boardRect = board.getBoundingClientRect()
  const cell = boardRect.width / SIZE
  const ox = boardRect.left - canvasRect.left
  const oy = boardRect.top - canvasRect.top
  const list: ParticleInit[] = []
  for (const effect of fresh) {
    list.push(
      ...particlesFor(effect, ox + (effect.col + 0.5) * cell, oy + (effect.row + 0.5) * cell, cell),
    )
  }
  layer.spawn(list)
}

watch(() => props.effects, spawnNew)

function onResize(): void {
  layer?.resize()
}

onMounted(() => {
  if (canvas.value) layer = new ParticleLayer(canvas.value)
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  layer?.destroy()
  window.removeEventListener('resize', onResize)
})
</script>

<template>
  <canvas ref="canvas" class="board-particles" aria-hidden="true" />
</template>

<style scoped>
.board-particles {
  position: absolute;
  inset: -48px;
  z-index: var(--z-board-fx);
  width: calc(100% + 96px);
  height: calc(100% + 96px);
  pointer-events: none;
}

:root[data-motion='reduced'] .board-particles {
  display: none;
}
</style>
