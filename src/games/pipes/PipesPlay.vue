<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, toRaw, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AppBar from '@/components/AppBar.vue'
import GameBackdrop from '@/components/GameBackdrop.vue'
import AppButton from '@/components/AppButton.vue'
import AppDialog from '@/components/AppDialog.vue'
import AppIcon from '@/components/AppIcon.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import LoadingOverlay from '@/components/LoadingOverlay.vue'
import ResultDialog from '@/components/ResultDialog.vue'
import { formatDuration } from '@/core/format'
import { t } from '@/core/i18n'
import { returnTo } from '@/core/navigation'
import { randomSeed } from '@/core/rng'
import { recordFinish, recordStart } from '@/core/stats'
import { load, remove, save } from '@/core/storage'
import { motionEnabled } from '@/core/theme'
import { useStopwatch } from '@/core/timer'
import { showToast } from '@/core/toast'
import { DIFFICULTIES, SAVE_KEY, sizeLabel, type Difficulty } from './index'
import { generatePuzzle } from './logic/generator'
import { colors, getHint, isSolved } from './logic/rules'
import { isPipesSave, sourcesOf, type PipesPuzzle, type PipesSave } from './logic/types'
import PipesBoard from './PipesBoard.vue'
import PipesRules from './PipesRules.vue'

const route = useRoute()
const router = useRouter()

type Status = 'loading' | 'playing' | 'won'

const status = ref<Status>('loading')
const game = ref<PipesSave | null>(null)
const stopwatch = useStopwatch(0)
const highlight = ref<number | null>(null)

const water = computed(() => (game.value ? colors(game.value.puzzle, game.value.turns) : []))
const sources = computed(() => (game.value ? sourcesOf(game.value.puzzle) : []))
const lockedSet = computed(() => new Set(game.value?.locked ?? []))
const waterPercent = computed(() =>
  water.value.length ? Math.round((water.value.filter((c) => c >= 0).length / water.value.length) * 100) : 0,
)
const levelLabel = computed(() =>
  game.value
    ? t('pipes.variantLabel', {
        difficulty: t(`difficulty.${game.value.puzzle.difficulty}`),
        size: sizeLabel(game.value.puzzle.difficulty),
      })
    : '',
)

// --- Persistence ------------------------------------------------------------------

function persist(): void {
  const g = game.value
  // Saved only once the player did something (`started`).
  if (!g || status.value !== 'playing' || !started) return
  save(SAVE_KEY, { ...toRaw(g), elapsedMs: Math.round(stopwatch.elapsedMs.value) })
}

function onVisibilityChange(): void {
  if (document.hidden) persist()
}

let autosave: ReturnType<typeof setInterval> | undefined
let resultTimer: ReturnType<typeof setTimeout> | undefined

onMounted(() => {
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('pagehide', persist)
  autosave = setInterval(persist, 5000)
})

onBeforeUnmount(() => {
  persist()
  clearInterval(autosave)
  clearTimeout(resultTimer)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  window.removeEventListener('pagehide', persist)
})

// --- Starting / resuming ------------------------------------------------------------

/** Whether the statistics already counted this attempt as started. */
let started = false

function fresh(puzzle: PipesPuzzle): PipesSave {
  return { puzzle, turns: [...puzzle.scramble], locked: [], moves: 0, elapsedMs: 0, hintsUsed: 0, undo: [] }
}

function begin(next: PipesSave): void {
  game.value = next
  highlight.value = null
  result.value = null
  showResult.value = false
  started = false
  status.value = 'playing'
  stopwatch.reset(0)
  stopwatch.start()
}

function startNew(difficulty: Difficulty): void {
  remove(SAVE_KEY)
  void router.replace({ name: 'pipes-play' })
  begin(fresh(generatePuzzle(difficulty, randomSeed())))
}

function restartAttempt(): void {
  if (!game.value) return
  remove(SAVE_KEY)
  begin(fresh(game.value.puzzle))
}

function resume(): boolean {
  const saved = load(SAVE_KEY, null, (raw) => (isPipesSave(raw) ? raw : undefined))
  if (!saved) return false
  game.value = saved
  started = true
  stopwatch.reset(saved.elapsedMs)
  status.value = 'playing'
  stopwatch.start()
  return true
}

// --- Playing -----------------------------------------------------------------------

function markStarted(g: PipesSave): void {
  if (started) return
  started = true
  recordStart('pipes', g.puzzle.difficulty)
}

function onRotate(cell: number): void {
  const g = game.value
  if (!g || status.value !== 'playing') return
  if (lockedSet.value.has(cell)) {
    showToast(t('pipes.play.locked'))
    return
  }
  markStarted(g)
  highlight.value = null
  g.turns = g.turns.map((turn, c) => (c === cell ? (turn + 1) % 4 : turn))
  g.undo = [...g.undo, cell]
  g.moves += 1
  afterChange(g)
}

function onLock(cell: number): void {
  const g = game.value
  if (!g || status.value !== 'playing') return
  markStarted(g)
  g.locked = lockedSet.value.has(cell) ? g.locked.filter((c) => c !== cell) : [...g.locked, cell]
  persist()
}

const canUndo = computed(() => status.value === 'playing' && (game.value?.undo.length ?? 0) > 0)

function undo(): void {
  const g = game.value
  if (!g || !canUndo.value) return
  const cell = g.undo[g.undo.length - 1]!
  g.undo = g.undo.slice(0, -1)
  g.turns = g.turns.map((turn, c) => (c === cell ? (turn + 3) % 4 : turn))
  g.locked = g.locked.filter((c) => c !== cell)
  g.moves = Math.max(0, g.moves - 1)
  highlight.value = null
  persist()
}

function afterChange(g: PipesSave): void {
  if (isSolved(g.puzzle, g.turns)) win()
  else persist()
}

// --- Hints -----------------------------------------------------------------------------

function requestHint(): void {
  const g = game.value
  if (!g || status.value !== 'playing') return
  const hint = getHint(g.puzzle, g.turns, g.locked)
  if (hint.kind === 'none') {
    showToast(t('pipes.play.noHint'))
    return
  }
  markStarted(g)
  g.hintsUsed += 1
  highlight.value = hint.cell
  if (hint.kind === 'unlock') {
    g.locked = g.locked.filter((c) => c !== hint.cell)
    showToast(t('pipes.play.hintUnlock'))
    persist()
    return
  }
  // Turns of different tiles are independent, so dropping this tile's undo steps keeps the
  // rest of the history valid.
  g.turns = g.turns.map((turn, c) => (c === hint.cell ? 0 : turn))
  g.undo = g.undo.filter((c) => c !== hint.cell)
  g.locked = [...g.locked.filter((c) => c !== hint.cell), hint.cell]
  g.moves += 1
  showToast(t('pipes.play.hintTurn'))
  afterChange(g)
}

// --- Restart -------------------------------------------------------------------------

const confirmRestart = ref(false)

function confirmedRestart(): void {
  confirmRestart.value = false
  restartAttempt()
}

// --- Win -------------------------------------------------------------------------------

const result = ref<{ timeMs: number; newBest: boolean } | null>(null)
const showResult = ref(false)

function win(): void {
  const g = game.value
  if (!g) return
  stopwatch.pause()
  status.value = 'won'
  highlight.value = null
  markStarted(g)
  const timeMs = Math.round(stopwatch.elapsedMs.value)
  const { newBestTime } = recordFinish('pipes', g.puzzle.difficulty, { timeMs })
  remove(SAVE_KEY)
  result.value = { timeMs, newBest: newBestTime }
  resultTimer = setTimeout(() => (showResult.value = true), motionEnabled.value ? 900 : 0)
}

const resultRows = computed(() => {
  const g = game.value
  if (!g || !result.value) return []
  return [
    { label: t('common.difficulty'), value: t(`difficulty.${g.puzzle.difficulty}`) },
    { label: t('common.size'), value: sizeLabel(g.puzzle.difficulty) },
    { label: t('common.time'), value: formatDuration(result.value.timeMs), highlight: result.value.newBest },
    { label: t('pipes.play.moves'), value: String(g.moves) },
    { label: t('common.hints'), value: String(g.hintsUsed) },
  ]
})

function playAgain(): void {
  showResult.value = false
  startNew(game.value?.puzzle.difficulty ?? 'easy')
}

function goToMenu(): void {
  showResult.value = false
  void returnTo(router, { name: 'pipes' })
}

function goHome(): void {
  showResult.value = false
  void returnTo(router, { name: 'home' })
}

const showRules = ref(false)

watch(
  () => route.query.new,
  (value) => {
    if (typeof value === 'string' && (DIFFICULTIES as readonly string[]).includes(value)) {
      startNew(value as Difficulty)
    }
  },
  { immediate: true },
)

if (typeof route.query.new !== 'string' && !resume()) {
  void router.replace({ name: 'pipes' })
}
</script>

<template>
  <AppBar :title="t('pipes.name')" back-to="/pipes">
    <template #actions>
      <span v-if="status !== 'loading'" class="timer tabular" :aria-label="t('common.time')">
        <AppIcon name="clock" :size="18" />
        {{ formatDuration(stopwatch.elapsedMs.value) }}
      </span>
      <button type="button" class="icon-btn" :aria-label="t('pipes.play.rules')" @click="showRules = true">
        <AppIcon name="info" />
      </button>
    </template>
  </AppBar>

  <main class="play">
    <GameBackdrop game="pipes" />
    <LoadingOverlay v-if="status === 'loading' || !game" :label="t('common.generating')" />

    <template v-else>
      <div class="hud tabular">
        <div class="hud__item">
          <span class="hud__label">{{ t('common.difficulty') }}</span>
          <span class="hud__value hud__value--level">{{ levelLabel }}</span>
        </div>
        <div class="hud__item">
          <span class="hud__label">{{ t('pipes.play.moves') }}</span>
          <span class="hud__value">{{ game.moves }}</span>
        </div>
        <div class="hud__item">
          <span class="hud__label">{{ t('pipes.play.connected') }}</span>
          <span class="hud__value">{{ waterPercent }} %</span>
        </div>
      </div>

      <div
        class="board-wrap"
        :style="{ '--ratio': game.puzzle.width / game.puzzle.height, '--cols': game.puzzle.width }"
      >
        <PipesBoard
          :width="game.puzzle.width"
          :height="game.puzzle.height"
          :sources="sources"
          :solution="game.puzzle.solution"
          :turns="game.turns"
          :locked="lockedSet"
          :water="water"
          :highlight="highlight"
          :disabled="status !== 'playing'"
          :solved="status === 'won'"
          @rotate="onRotate"
          @lock="onLock"
        />
      </div>

      <div class="toolbar">
        <AppButton icon="undo" :disabled="!canUndo" @click="undo">{{ t('pipes.play.undo') }}</AppButton>
        <AppButton icon="hint" :disabled="status !== 'playing'" @click="requestHint">{{ t('common.hint') }}</AppButton>
        <AppButton
          class="toolbar__icon"
          icon="restart"
          :disabled="status !== 'playing'"
          :aria-label="t('pipes.play.restart')"
          :title="t('pipes.play.restart')"
          @click="confirmRestart = true"
        />
      </div>
    </template>
  </main>

  <AppDialog :open="showRules" :title="t('pipes.rules.title')" @close="showRules = false">
    <PipesRules />
  </AppDialog>

  <ConfirmDialog
    :open="confirmRestart"
    :message="t('pipes.play.restartConfirm')"
    :confirm-label="t('pipes.play.restart')"
    danger
    @confirm="confirmedRestart"
    @cancel="confirmRestart = false"
  />

  <ResultDialog
    :open="showResult"
    :title="t('common.solved')"
    :share="result && game ? { game: 'pipes', variant: game.puzzle.difficulty, result: formatDuration(result.timeMs), kind: 'time', newBest: result.newBest } : undefined"
    :subtitle="t('pipes.result.solvedText')"
    :rows="resultRows"
    :badge="result?.newBest ? t('common.newBest') : undefined"
  >
    <template #actions>
      <AppButton variant="primary" block @click="playAgain">{{ t('common.newGame') }}</AppButton>
      <AppButton block @click="goToMenu">{{ t('pipes.play.toMenu') }}</AppButton>
      <AppButton variant="ghost" icon="home" block @click="goHome">{{ t('common.home') }}</AppButton>
    </template>
  </ResultDialog>
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

.timer {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 0 var(--space-2);
  font-weight: 600;
  color: var(--color-text-muted);
}

.hud {
  display: flex;
  justify-content: center;
  gap: var(--space-4);
}

.hud__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  white-space: nowrap;
}

.hud__label {
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.hud__value {
  font-size: var(--text-lg);
  font-weight: 800;
  line-height: 28px;
}

.hud__value--level {
  font-size: var(--text-md);
  color: var(--game-pipes);
}

.board-wrap {
  width: min(
    100%,
    520px,
    calc((100dvh - 250px - env(safe-area-inset-top) - env(safe-area-inset-bottom)) * var(--ratio))
  );
  /* Cells stay at least 26 px wide (WCAG 2.5.8); on short screens the page scrolls instead. */
  min-width: min(100%, calc(var(--cols) * 28px + 8px));
}

.toolbar {
  display: flex;
  gap: var(--space-2);
  justify-content: center;
  width: 100%;
}

.toolbar > * {
  flex: 1;
  max-width: 200px;
  white-space: nowrap;
}

.toolbar > .toolbar__icon {
  flex: none;
  width: var(--tap-min);
  padding: 0;
}
</style>
