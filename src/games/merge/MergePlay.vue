<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'

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
import type { Variant } from './index'
import {
  highestTile,
  newRun,
  slide,
  targetOf,
  type Direction,
  type MergeRun,
} from './logic/engine'
import MergeBoard from './MergeBoard.vue'
import type { DisplayTile } from './boardTypes'
import { clearRun, loadRun, recordHighestTile, saveRun } from './store'
import MergeRules from './MergeRules.vue'

const props = defineProps<{ variant: Variant }>()

const route = useRoute()
const router = useRouter()

/** Duration of the slide phase; matches `--dur-fast` used by the board's transition. */
const SLIDE_MS = 120

// ---------------------------------------------------------------------------
// Run setup: a new run (`?new=1`) or the saved one of this variant.

const isNew = route.query.new === '1'
const initial: MergeRun | null = isNew ? newRun(props.variant, randomSeed()) : loadRun(props.variant)
const run = shallowRef<MergeRun | null>(initial)

function toDisplay(current: MergeRun | null): DisplayTile[] {
  return (current?.tiles ?? []).map((tile) => ({ ...tile, state: 'normal' }))
}

const display = shallowRef<DisplayTile[]>(toDisplay(initial))

if (isNew) {
  // Drop `?new=1` right away so a reload resumes this run instead of starting another one.
  void router.replace({ name: 'merge-play', params: { variant: props.variant } })
}

// ---------------------------------------------------------------------------
// Persistence – a run is only saved once it has at least one move.

function persist(): void {
  const current = run.value
  if (!current || current.over) return
  if (current.moves === 0) {
    clearRun(props.variant)
    return
  }
  saveRun(current)
}

function onVisibilityChange(): void {
  if (document.hidden) persist()
}

// ---------------------------------------------------------------------------
// Dialog state

const menuOpen = ref(false)
const showRules = ref(false)
const confirmNew = ref(false)
const targetOpen = ref(false)

interface GameOverResult {
  score: number
  best: number
  highest: number
  moves: number
  newBest: boolean
  newTile: boolean
}

const result = ref<GameOverResult | null>(null)

const blocked = computed(
  () =>
    !run.value ||
    run.value.over ||
    menuOpen.value ||
    showRules.value ||
    confirmNew.value ||
    targetOpen.value ||
    result.value !== null,
)

const bestScore = computed(() =>
  Math.max(getVariantStats('merge', props.variant).bestScore ?? 0, run.value?.score ?? 0),
)

// ---------------------------------------------------------------------------
// Moves (with a queue of at most one direction while an animation runs)

let animating = false
let queued: Direction | null = null
let alive = true

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function move(direction: Direction): Promise<void> {
  if (blocked.value) return
  if (animating) {
    queued = direction
    return
  }
  const current = run.value!
  const outcome = slide(current, direction)
  if (!outcome.moved) return

  animating = true
  if (current.moves === 0) recordStart('merge', props.variant)
  run.value = outcome.run
  persist()

  if (motionEnabled.value) {
    // Phase 1: every old tile slides to its destination (merging tiles onto their partner).
    display.value = display.value.map((tile) => ({
      ...tile,
      cell: outcome.destinations.get(tile.id) ?? tile.cell,
      state: 'normal',
    }))
    await wait(SLIDE_MS)
    if (!alive) return
  }
  // Phase 2: merged tiles pop, the new tile appears.
  display.value = outcome.run.tiles.map((tile) => ({
    ...tile,
    state: outcome.mergedIds.has(tile.id)
      ? 'merged'
      : tile.id === outcome.spawned?.id
        ? 'new'
        : 'normal',
  }))

  if (outcome.run.over) finishRun()
  else if (outcome.reachedTarget) targetOpen.value = true

  animating = false
  const next = queued
  queued = null
  if (next) void move(next)
}

/** Records score and top tile of a run that had moves. */
function recordRun(current: MergeRun): { newBest: boolean; newTile: boolean } {
  const { newBestScore } = recordFinish('merge', props.variant, { score: current.score })
  const newTile = recordHighestTile(props.variant, highestTile(current.tiles))
  return { newBest: newBestScore, newTile }
}

function finishRun(): void {
  const current = run.value
  if (!current) return
  clearRun(props.variant)
  const { newBest, newTile } = recordRun(current)
  result.value = {
    score: current.score,
    best: bestScore.value,
    highest: highestTile(current.tiles),
    moves: current.moves,
    newBest,
    newTile,
  }
}

// ---------------------------------------------------------------------------
// Menu & dialogs

function startNew(): void {
  const current = run.value
  if (current && current.moves > 0 && !current.over) recordRun(current)
  menuOpen.value = false
  confirmNew.value = false
  targetOpen.value = false
  result.value = null
  queued = null
  run.value = newRun(props.variant, randomSeed())
  display.value = toDisplay(run.value)
  persist()
}

function requestNew(): void {
  if (run.value && run.value.moves > 0 && !run.value.over) {
    menuOpen.value = false
    confirmNew.value = true
  } else {
    startNew()
  }
}

function keepPlaying(): void {
  if (!run.value) return
  run.value = { ...run.value, keepPlaying: true }
  targetOpen.value = false
  persist()
}

function toMenu(): void {
  menuOpen.value = false
  void returnTo(router, { name: 'merge' })
}

function toHome(): void {
  void returnTo(router, { name: 'home' })
}

const resultRows = computed(() => {
  const r = result.value
  if (!r) return []
  return [
    { label: t('common.score'), value: formatNumber(r.score), highlight: r.newBest },
    { label: t('common.best'), value: formatNumber(r.best) },
    { label: t('merge.result.highestTile'), value: formatNumber(r.highest), highlight: r.newTile },
    { label: t('merge.result.moves'), value: formatNumber(r.moves) },
  ]
})

const resultBadge = computed(() => {
  if (result.value?.newBest) return t('common.newBest')
  if (result.value?.newTile) return t('merge.result.newRecordTile')
  return undefined
})

// ---------------------------------------------------------------------------
// Keyboard

const KEYS: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
}

function onKeydown(event: KeyboardEvent): void {
  if (event.ctrlKey || event.metaKey || event.altKey) return
  const target = event.target as HTMLElement | null
  if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
  const direction = KEYS[event.key.length === 1 ? event.key.toLowerCase() : event.key]
  if (!direction) return
  event.preventDefault()
  void move(direction)
}

// ---------------------------------------------------------------------------
// Lifecycle

onMounted(() => {
  if (!run.value) {
    // Nothing to resume – back to the lobby.
    void router.replace({ name: 'merge' })
    return
  }
  if (isNew) persist() // drops an older, replaced save of this variant
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  alive = false
  persist()
  document.removeEventListener('visibilitychange', onVisibilityChange)
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <AppBar :title="t(`merge.variants.${variant}`)" :back-to="{ name: 'merge' }">
    <template #actions>
      <button type="button" class="icon-btn" :aria-label="t('common.rules')" @click="showRules = true">
        <AppIcon name="info" />
      </button>
      <button
        v-if="run"
        type="button"
        class="icon-btn"
        :aria-label="t('common.pause')"
        :disabled="result !== null"
        @click="menuOpen = true"
      >
        <AppIcon name="pause" />
      </button>
    </template>
  </AppBar>

  <main v-if="run" class="play">
    <GameBackdrop game="merge" />
    <section class="hud">
      <div class="hud__stat">
        <span class="hud__label">{{ t('common.score') }}</span>
        <strong class="hud__value tabular">{{ formatNumber(run.score) }}</strong>
      </div>
      <div class="hud__stat">
        <span class="hud__label">{{ t('merge.play.best') }}</span>
        <strong class="hud__value tabular">{{ formatNumber(bestScore) }}</strong>
      </div>
      <div class="hud__stat hud__stat--target">
        <span class="hud__label">{{ t('merge.play.target') }}</span>
        <strong class="hud__value tabular">{{ formatNumber(targetOf(variant)) }}</strong>
      </div>
    </section>

    <div class="board-wrap">
      <MergeBoard :size="run.size" :tiles="display" @move="move" />
    </div>
    <p class="hint muted">{{ t('merge.play.swipeHint') }}</p>
  </main>

  <AppDialog :open="menuOpen" :title="t('merge.pause.title')" @close="menuOpen = false">
    <div class="menu">
      <AppButton variant="primary" icon="play" block @click="menuOpen = false">
        {{ t('common.resume') }}
      </AppButton>
      <AppButton icon="restart" block @click="requestNew">{{ t('merge.pause.newGame') }}</AppButton>
      <AppButton variant="ghost" icon="back" block @click="toMenu">{{ t('merge.pause.quit') }}</AppButton>
    </div>
  </AppDialog>

  <ConfirmDialog
    :open="confirmNew"
    :message="t('merge.pause.confirmNew')"
    :confirm-label="t('merge.pause.newGame')"
    @confirm="startNew"
    @cancel="confirmNew = false"
  />

  <AppDialog
    :open="targetOpen"
    :title="t('merge.target.title', { target: formatNumber(targetOf(variant)) })"
    :dismissible="false"
    @close="keepPlaying"
  >
    <p>{{ t('merge.target.text') }}</p>
    <template #actions>
      <AppButton variant="primary" block @click="keepPlaying">{{ t('merge.target.keepPlaying') }}</AppButton>
      <AppButton block @click="startNew">{{ t('merge.target.newGame') }}</AppButton>
    </template>
  </AppDialog>

  <ResultDialog
    :open="result !== null"
    :title="t('merge.result.gameOver')"
    :share="result ? { game: 'merge', variant, result: formatNumber(result.score), kind: 'score', newBest: result.newBest } : undefined"
    :celebrate="result?.newBest ?? false"
    :rows="resultRows"
    :badge="resultBadge"
  >
    <template #actions>
      <AppButton variant="primary" block @click="startNew">{{ t('merge.result.playAgain') }}</AppButton>
      <AppButton block @click="toMenu">{{ t('merge.result.menu') }}</AppButton>
      <AppButton variant="ghost" icon="home" block @click="toHome">{{ t('common.home') }}</AppButton>
    </template>
  </ResultDialog>
  <AppDialog :open="showRules" :title="t('merge.lobby.howToTitle')" @close="showRules = false">
    <MergeRules />
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
  width: min(100%, 520px);
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

.hud__stat--target {
  background: color-mix(in srgb, var(--game-merge) 14%, var(--color-surface));
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

.board-wrap {
  /* Width-bound on phones, height-bound on short screens. */
  width: min(100%, 520px, calc(100dvh - 250px - env(safe-area-inset-top) - env(safe-area-inset-bottom)));
  min-width: min(100%, 260px);
}

.hint {
  font-size: var(--text-sm);
}

.menu {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
</style>
