<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { useRouter } from 'vue-router'

import AppBar from '@/components/AppBar.vue'
import GameBackdrop from '@/components/GameBackdrop.vue'
import AppButton from '@/components/AppButton.vue'
import AppDialog from '@/components/AppDialog.vue'
import AppIcon from '@/components/AppIcon.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import ResultDialog from '@/components/ResultDialog.vue'
import { formatNumber } from '@/core/format'
import { t } from '@/core/i18n'
import { returnTo } from '@/core/navigation'
import { randomSeed } from '@/core/rng'
import { getVariantStats, recordFinish, recordStart } from '@/core/stats'
import { motionEnabled } from '@/core/theme'
import type { PlayRouteProps } from '../routes'
import BlockPiece from './BlockPiece.vue'
import BlocksBoard from './BlocksBoard.vue'
import type { ClearingBlock } from './boardTypes'
import {
  CLEAR_BOARD_BONUS,
  SIZE,
  cellsOf,
  newRun,
  place,
  type BlocksRun,
  type PlaceResult,
} from './logic/engine'
import { clearRun, loadRun, saveRun } from './store'
import BlocksRules from './BlocksRules.vue'
import { useBlocksPlacement } from './useBlocksPlacement'

const props = defineProps<PlayRouteProps>()

const router = useRouter()

// ---------------------------------------------------------------------------
// Run: a new one (`?new=1`) or the saved one.

const isNew = props.newGame === '1'
const run = shallowRef<BlocksRun | null>(isNew ? newRun(randomSeed()) : loadRun())
if (isNew) void router.replace({ name: 'blocks-play' })

const best = computed(() =>
  Math.max(getVariantStats('blocks', 'classic').bestScore ?? 0, run.value?.score ?? 0),
)

function persist(): void {
  const current = run.value
  if (!current || current.over) return
  if (current.moves === 0) clearRun()
  else saveRun(current)
}

function onVisibilityChange(): void {
  if (document.hidden) persist()
}

// ---------------------------------------------------------------------------
// Dialogs

const menuOpen = ref(false)
const showRules = ref(false)
const confirmNew = ref(false)
const result = ref<{ score: number; best: number; lines: number; moves: number; newBest: boolean } | null>(
  null,
)
const finished = ref(false)
const locked = computed(
  () => !run.value || finished.value || menuOpen.value || showRules.value || confirmNew.value,
)

// ---------------------------------------------------------------------------
// Board geometry

const boardRef = ref<InstanceType<typeof BlocksBoard> | null>(null)
const boardEl = computed(() => boardRef.value?.root ?? null)
/** Size of one board cell in px (updated on resize and when a drag starts). */
const cellPx = ref(40)

function measure(): void {
  const rect = boardEl.value?.getBoundingClientRect()
  if (rect && rect.width > 0) cellPx.value = rect.width / SIZE
}

/** Block size in the tray: pieces up to 5 cells long fit into one slot. */
const trayCell = computed(() => Math.min(22, Math.max(12, cellPx.value * 0.5)))

// ---------------------------------------------------------------------------
// Selection, drag and preview (useBlocksPlacement.ts)

const {
  selected,
  cursor,
  drag,
  dragBox,
  ghost,
  completing,
  fits,
  onTrayPointerDown,
  onTrayPointerMove,
  onTrayPointerUp,
  onTrayPointerCancel,
  onBoardTap,
} = useBlocksPlacement({ run, boardEl, cellPx, measure, locked, commit: (slot, anchor) => commit(slot, anchor) })

// ---------------------------------------------------------------------------
// Placing, animations and announcements

const clearing = ref<ClearingBlock[]>([])
const clearKey = ref(0)
const placedCells = ref<Set<number> | null>(null)
const scoreKey = ref(0)
const banner = ref<{ key: number; points: string; text: string } | null>(null)
let bannerKey = 0
const announcement = ref('')
const timers = new Set<ReturnType<typeof setTimeout>>()

function later(ms: number, action: () => void): void {
  const timer = setTimeout(() => {
    timers.delete(timer)
    action()
  }, ms)
  timers.add(timer)
}

function describe(outcome: PlaceResult): string {
  const lines = outcome.clearedRows.length + outcome.clearedCols.length
  if (outcome.boardCleared) return t('blocks.play.boardCleared', { bonus: CLEAR_BOARD_BONUS })
  if (outcome.combo >= 2) return t('blocks.play.combo', { n: outcome.combo })
  if (lines >= 2) return t('blocks.play.lines', { n: lines })
  return ''
}

function commit(slot: number, anchor: number): void {
  const current = run.value
  if (!current || locked.value) return
  const outcome = place(current, slot, anchor)
  if (!outcome) return
  if (current.moves === 0) recordStart('blocks', 'classic')
  run.value = outcome.run
  selected.value = null
  persist()

  const motion = motionEnabled.value
  placedCells.value = new Set(outcome.placed.filter((cell) => outcome.run.board[cell] !== 0))
  scoreKey.value++

  if (outcome.clearedCells.length > 0) {
    const centre = outcome.placed.reduce(
      (acc, cell) => ({ r: acc.r + Math.floor(cell / SIZE), c: acc.c + (cell % SIZE) }),
      { r: 0, c: 0 },
    )
    const r0 = centre.r / outcome.placed.length
    const c0 = centre.c / outcome.placed.length
    clearing.value = motion
      ? outcome.clearedCells.map(({ cell, color }) => ({
          cell,
          color,
          delay: Math.round((Math.abs(Math.floor(cell / SIZE) - r0) + Math.abs((cell % SIZE) - c0)) * 28),
        }))
      : []
    clearKey.value++
    later(900, () => (clearing.value = []))
  }

  const text = describe(outcome)
  if (outcome.clearedCells.length > 0 || text) {
    banner.value = { key: ++bannerKey, points: `+${formatNumber(outcome.gained)}`, text }
    const key = bannerKey
    later(1100, () => {
      if (banner.value?.key === key) banner.value = null
    })
  }
  announcement.value = [`+${outcome.gained}`, text].filter(Boolean).join(' · ')

  if (outcome.run.over) {
    finished.value = true
    announcement.value = t('blocks.play.noSpace')
    later(motion ? 900 : 0, finishRun)
  }
}

function finishRun(): void {
  const current = run.value
  if (!current) return
  clearRun()
  const previousBest = getVariantStats('blocks', 'classic').bestScore ?? 0
  const { newBestScore } = recordFinish('blocks', 'classic', { score: current.score })
  result.value = {
    score: current.score,
    best: Math.max(previousBest, current.score),
    lines: current.lines,
    moves: current.moves,
    newBest: newBestScore,
  }
}

const resultRows = computed(() => {
  const r = result.value
  if (!r) return []
  return [
    { label: t('common.score'), value: formatNumber(r.score), highlight: r.newBest },
    { label: t('common.best'), value: formatNumber(r.best) },
    { label: t('blocks.result.lines'), value: formatNumber(r.lines) },
    { label: t('blocks.result.moves'), value: formatNumber(r.moves) },
  ]
})

// ---------------------------------------------------------------------------
// Menu

function startNew(): void {
  const current = run.value
  if (current && current.moves > 0 && !current.over && !finished.value) {
    recordFinish('blocks', 'classic', { score: current.score })
  }
  for (const timer of timers) clearTimeout(timer)
  timers.clear()
  menuOpen.value = false
  confirmNew.value = false
  result.value = null
  finished.value = false
  selected.value = null
  clearing.value = []
  banner.value = null
  run.value = newRun(randomSeed())
  persist()
}

function requestNew(): void {
  if (run.value && run.value.moves > 0 && !finished.value) {
    menuOpen.value = false
    confirmNew.value = true
  } else {
    startNew()
  }
}

function toMenu(): void {
  menuOpen.value = false
  void returnTo(router, { name: 'blocks' })
}

function toHome(): void {
  void returnTo(router, { name: 'home' })
}

// ---------------------------------------------------------------------------
// Keyboard: 1–3 select a piece, arrows move the cursor, Enter places.

function onKeydown(event: KeyboardEvent): void {
  if (locked.value || event.ctrlKey || event.metaKey || event.altKey) return
  const current = run.value!
  if (/^[1-3]$/.test(event.key)) {
    const slot = Number(event.key) - 1
    if (current.tray[slot]) selected.value = slot
    cursor.value ??= 0
    event.preventDefault()
    return
  }
  const deltas: Record<string, [number, number]> = {
    ArrowUp: [-1, 0],
    ArrowDown: [1, 0],
    ArrowLeft: [0, -1],
    ArrowRight: [0, 1],
  }
  const delta = deltas[event.key]
  if (delta) {
    const cell = cursor.value ?? 0
    const row = Math.min(SIZE - 1, Math.max(0, Math.floor(cell / SIZE) + delta[0]))
    const col = Math.min(SIZE - 1, Math.max(0, (cell % SIZE) + delta[1]))
    cursor.value = row * SIZE + col
    event.preventDefault()
  } else if ((event.key === 'Enter' || event.key === ' ') && selected.value !== null && cursor.value !== null) {
    commit(selected.value, cursor.value)
    event.preventDefault()
  } else if (event.key === 'Escape') {
    selected.value = null
  }
}

function onWindowKeydown(event: KeyboardEvent): void {
  // Digits work everywhere on the page; the board handles the rest while focused.
  if (/^[1-3]$/.test(event.key) && document.activeElement !== boardEl.value) onKeydown(event)
}

// ---------------------------------------------------------------------------
// Lifecycle

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  if (!run.value) {
    void router.replace({ name: 'blocks' })
    return
  }
  if (isNew) persist()
  measure()
  if (typeof ResizeObserver !== 'undefined' && boardEl.value) {
    resizeObserver = new ResizeObserver(measure)
    resizeObserver.observe(boardEl.value)
  }
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('keydown', onWindowKeydown)
})

onBeforeUnmount(() => {
  persist()
  for (const timer of timers) clearTimeout(timer)
  resizeObserver?.disconnect()
  document.removeEventListener('visibilitychange', onVisibilityChange)
  window.removeEventListener('keydown', onWindowKeydown)
})
</script>

<template>
  <AppBar :title="t('blocks.name')" :back-to="{ name: 'blocks' }">
    <template #actions>
      <button type="button" class="icon-btn" :aria-label="t('common.rules')" @click="showRules = true">
        <AppIcon name="info" />
      </button>
      <button
        v-if="run"
        type="button"
        class="icon-btn"
        :aria-label="t('common.pause')"
        :disabled="finished"
        @click="menuOpen = true"
      >
        <AppIcon name="pause" />
      </button>
    </template>
  </AppBar>

  <main v-if="run" class="play">
    <GameBackdrop game="blocks" />
    <section class="hud">
      <div class="hud__stat">
        <span class="hud__label">{{ t('common.score') }}</span>
        <strong :key="scoreKey" class="hud__value hud__value--bump tabular" data-score>
          {{ formatNumber(run.score) }}
        </strong>
      </div>
      <div class="hud__stat">
        <span class="hud__label">{{ t('blocks.play.best') }}</span>
        <strong class="hud__value tabular">{{ formatNumber(best) }}</strong>
      </div>
    </section>

    <div class="board-wrap">
      <BlocksBoard
        ref="boardRef"
        :board="run.board"
        :ghost="ghost"
        :completing="completing"
        :clearing="clearing"
        :clear-key="clearKey"
        :placed="placedCells"
        :cursor="cursor"
        @tap="onBoardTap"
        @keydown="onKeydown"
      />
      <div v-if="banner" :key="banner.key" class="banner" aria-hidden="true">
        <strong class="banner__points tabular">{{ banner.points }}</strong>
        <span v-if="banner.text" class="banner__text">{{ banner.text }}</span>
      </div>
    </div>

    <ul class="tray" :aria-label="t('blocks.play.tray')">
      <li v-for="(piece, slot) in run.tray" :key="slot" class="tray__slot">
        <button
          v-if="piece"
          type="button"
          class="tray__piece"
          :class="{
            'tray__piece--selected': selected === slot,
            'tray__piece--dragging': drag?.slot === slot && drag.moved,
            'tray__piece--blocked': !fits[slot],
          }"
          :aria-label="t('blocks.play.piece', { n: slot + 1, cells: cellsOf(piece).length })"
          :aria-pressed="selected === slot"
          :disabled="finished"
          @pointerdown="onTrayPointerDown(slot, $event)"
          @pointermove="onTrayPointerMove"
          @pointerup="onTrayPointerUp"
          @pointercancel="onTrayPointerCancel"
          @lostpointercapture="onTrayPointerCancel"
          @keydown.enter.prevent="selected = slot"
        >
          <BlockPiece :piece="piece" :cell="trayCell" />
        </button>
        <span v-else class="tray__empty" :aria-label="t('blocks.play.piecePlaced', { n: slot + 1 })" />
      </li>
    </ul>

    <p class="hint muted">{{ t('blocks.play.keyboardHint') }}</p>
    <p class="visually-hidden" aria-live="polite">{{ announcement }}</p>
  </main>

  <div
    v-if="dragBox && drag?.moved"
    class="floating"
    :style="{ transform: `translate3d(${dragBox.left}px, ${dragBox.top}px, 0)` }"
    aria-hidden="true"
  >
    <BlockPiece :piece="dragBox.piece" :cell="cellPx" />
  </div>

  <AppDialog :open="menuOpen" :title="t('blocks.pause.title')" @close="menuOpen = false">
    <div class="menu">
      <AppButton variant="primary" icon="play" block @click="menuOpen = false">
        {{ t('common.resume') }}
      </AppButton>
      <AppButton icon="restart" block @click="requestNew">{{ t('blocks.pause.newGame') }}</AppButton>
      <AppButton variant="ghost" icon="back" block @click="toMenu">{{ t('blocks.pause.quit') }}</AppButton>
    </div>
  </AppDialog>

  <ConfirmDialog
    :open="confirmNew"
    :message="t('blocks.pause.confirmNew')"
    :confirm-label="t('blocks.pause.newGame')"
    @confirm="startNew"
    @cancel="confirmNew = false"
  />

  <ResultDialog
    :open="result !== null"
    :title="t('blocks.result.gameOver')"
    :share="result ? { game: 'blocks', variant: 'classic', result: formatNumber(result.score), kind: 'score', newBest: result.newBest } : undefined"
    :celebrate="result?.newBest ?? false"
    :rows="resultRows"
    :badge="result?.newBest ? t('common.newBest') : undefined"
  >
    <template #actions>
      <AppButton variant="primary" block @click="startNew">{{ t('blocks.result.playAgain') }}</AppButton>
      <AppButton block @click="toMenu">{{ t('blocks.result.menu') }}</AppButton>
      <AppButton variant="ghost" icon="home" block @click="toHome">{{ t('common.home') }}</AppButton>
    </template>
  </ResultDialog>
  <AppDialog :open="showRules" :title="t('blocks.lobby.howToTitle')" @close="showRules = false">
    <BlocksRules />
  </AppDialog>
</template>

<style scoped>
.play {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  max-width: var(--content-max);
  margin: 0 auto;
  padding: var(--space-2) max(var(--space-3), env(safe-area-inset-right))
    max(var(--space-4), env(safe-area-inset-bottom)) max(var(--space-3), env(safe-area-inset-left));
}

.hud {
  display: flex;
  gap: var(--space-2);
  width: min(100%, 480px);
}

.hud__stat {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  padding: var(--space-2);
  border-radius: 0;
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.hud__label {
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.hud__value {
  font-size: var(--text-xl);
  font-weight: 800;
}

.hud__value--bump {
  animation: score-bump 0.3s var(--ease-out);
}

.board-wrap {
  position: relative;
  /* Width-bound on phones, height-bound on short screens (leaves room for the tray). */
  width: min(100%, 480px, calc(100dvh - 330px - env(safe-area-inset-top) - env(safe-area-inset-bottom)));
  min-width: min(100%, 260px);
}

.banner {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  pointer-events: none;
  transform: translate(-50%, -50%);
  animation: banner 1.1s var(--ease-out) forwards;
}

.banner__points {
  font-size: 2.4rem;
  font-weight: 900;
  color: var(--game-blocks);
  /* White outline: readable on empty cells and on blocks alike. */
  text-shadow:
    2px 0 0 #fff,
    -2px 0 0 #fff,
    0 2px 0 #fff,
    0 -2px 0 #fff,
    0 4px 12px rgb(0 0 0 / 35%);
}

.banner__text {
  padding: 2px 12px;
  border-radius: var(--radius-full);
  background: var(--game-blocks);
  color: var(--on-game);
  font-size: var(--text-md);
  font-weight: 800;
  box-shadow: 0 3px 10px rgb(0 0 0 / 30%);
}

.tray {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-2);
  width: min(100%, 480px);
  margin: 0;
  padding: 0;
  list-style: none;
}

.tray__slot {
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
  min-height: 0;
  border-radius: 0;
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.tray__piece {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 2px solid transparent;
  border-radius: var(--radius-md);
  background: transparent;
  cursor: grab;
  touch-action: none;
  transition:
    transform var(--dur-fast) var(--ease-out),
    opacity var(--dur-fast);
}

.tray__piece--selected {
  border-color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 10%, transparent);
  transform: scale(1.05);
}

.tray__piece--dragging {
  opacity: 0.2;
}

.tray__piece--blocked {
  opacity: 0.35;
  filter: grayscale(0.7);
}

.floating {
  /* Moved with a transform (no layout per pointer move). */
  position: fixed;
  top: 0;
  left: 0;
  z-index: var(--z-drag);
  will-change: transform;
  pointer-events: none;
  filter: drop-shadow(0 8px 10px rgb(0 0 0 / 30%));
}

.hint {
  font-size: var(--text-xs);
  text-align: center;
}

@media (pointer: coarse) {
  .hint {
    display: none;
  }
}

.menu {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

@keyframes score-bump {
  40% {
    transform: scale(1.18);
    color: var(--game-blocks);
  }
}

@keyframes banner {
  0% {
    opacity: 0;
    transform: translate(-50%, -30%) scale(0.6);
  }
  18% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.1);
  }
  70% {
    opacity: 1;
    transform: translate(-50%, -60%) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -90%) scale(0.95);
  }
}

:root[data-motion='reduced'] .hud__value--bump,
:root[data-motion='reduced'] .banner {
  animation: none;
}
</style>
