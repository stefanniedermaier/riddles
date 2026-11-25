<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, toRaw, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AppBar from '@/components/AppBar.vue'
import GameBackdrop from '@/components/GameBackdrop.vue'
import AppButton from '@/components/AppButton.vue'
import AppDialog from '@/components/AppDialog.vue'
import AppIcon from '@/components/AppIcon.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
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
import { isComplete, isSolved, pour, unpour } from './logic/rules'
import { solve } from './logic/solver'
import { isWaterSortSave, type WaterSortPuzzle, type WaterSortSave } from './logic/types'
import WaterSortBoard, { type Pour } from './WaterSortBoard.vue'
import WaterSortRules from './WaterSortRules.vue'
import { waterSortSettings } from './settings'

const route = useRoute()
const router = useRouter()

type Status = 'playing' | 'won'

const status = ref<Status>('playing')
const game = ref<WaterSortSave | null>(null)
const stopwatch = useStopwatch(0)
const selected = ref<number | null>(null)
const hint = ref<{ from: number; to: number } | null>(null)
/**
 * The rest of the solution the last hint came from. Following hints walks along it, so hints
 * always lead to the goal; any other move drops it.
 */
let hintPlan: { from: number; to: number }[] = []
const poured = ref<Pour | null>(null)
const refused = ref<{ tube: number; key: number } | null>(null)
let animationKey = 0

const sorted = computed(() => game.value?.tubes.filter(isComplete).length ?? 0)
const levelLabel = computed(() =>
  game.value
    ? t('watersort.variantLabel', {
        difficulty: t(`difficulty.${game.value.puzzle.difficulty}`),
        size: sizeLabel(game.value.puzzle.difficulty),
      })
    : '',
)

// --- Persistence ------------------------------------------------------------------

/** Whether the player did something in this attempt (saved and counted only then). */
let started = false

function persist(): void {
  const g = game.value
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

function fresh(puzzle: WaterSortPuzzle): WaterSortSave {
  return { puzzle, tubes: puzzle.tubes.map((tube) => [...tube]), history: [], moves: 0, elapsedMs: 0, hintsUsed: 0 }
}

function begin(next: WaterSortSave): void {
  game.value = next
  selected.value = null
  hint.value = null
  hintPlan = []
  poured.value = null
  result.value = null
  showResult.value = false
  started = false
  status.value = 'playing'
  stopwatch.reset(0)
  stopwatch.start()
}

function startNew(difficulty: Difficulty): void {
  remove(SAVE_KEY)
  void router.replace({ name: 'watersort-play' })
  begin(fresh(generatePuzzle(difficulty, randomSeed())))
}

function restartAttempt(): void {
  if (!game.value) return
  remove(SAVE_KEY)
  begin(fresh(game.value.puzzle))
}

function resume(): boolean {
  const saved = load(SAVE_KEY, null, (raw) => (isWaterSortSave(raw) ? raw : undefined))
  if (!saved) return false
  game.value = saved
  started = true
  stopwatch.reset(saved.elapsedMs)
  status.value = 'playing'
  stopwatch.start()
  return true
}

// --- Playing -----------------------------------------------------------------------

function markStarted(g: WaterSortSave): void {
  if (started) return
  started = true
  recordStart('watersort', g.puzzle.difficulty)
}

function doPour(g: WaterSortSave, from: number, to: number): boolean {
  const result = pour(g.tubes, { from, to })
  if (!result) return false
  markStarted(g)
  g.tubes = result.tubes
  g.history = [...g.history, result.move]
  g.moves += 1
  const followsPlan = hintPlan[0]?.from === from && hintPlan[0]?.to === to
  hintPlan = followsPlan ? hintPlan.slice(1) : []
  hint.value = null
  selected.value = null
  poured.value = { from, to, amount: result.move.amount, key: ++animationKey }
  if (isSolved(g.tubes)) win()
  else persist()
  return true
}

function onSelect(tube: number): void {
  const g = game.value
  if (!g || status.value !== 'playing') return
  const from = selected.value
  if (from === null) {
    if (g.tubes[tube]!.length > 0) selected.value = tube
    return
  }
  if (from === tube) {
    selected.value = null
    return
  }
  if (doPour(g, from, tube)) return
  if (g.tubes[tube]!.length > 0 && g.tubes[tube]!.length < 4 && !isComplete(g.tubes[tube]!)) {
    // Not allowed onto this tube – but the player probably wants to pick it up instead.
    selected.value = tube
    return
  }
  refused.value = { tube, key: ++animationKey }
  showToast(t('watersort.play.notAllowed'))
}

const canUndo = computed(() => status.value === 'playing' && (game.value?.history.length ?? 0) > 0)

function undo(): void {
  const g = game.value
  if (!g || !canUndo.value) return
  const last = g.history[g.history.length - 1]!
  g.tubes = unpour(g.tubes, last)
  g.history = g.history.slice(0, -1)
  g.moves += 1
  selected.value = null
  hint.value = null
  hintPlan = []
  poured.value = { to: last.from, amount: last.amount, key: ++animationKey }
  persist()
}

// --- Hints -----------------------------------------------------------------------------

function requestHint(): void {
  const g = game.value
  if (!g || status.value !== 'playing') return
  selected.value = null
  const moves = hintPlan.length ? hintPlan : solve(g.tubes)
  hintPlan = moves ?? []
  markStarted(g)
  g.hintsUsed += 1
  if (!moves || moves.length === 0) {
    hint.value = null
    showToast(t('watersort.play.deadEnd'))
  } else {
    hint.value = moves[0]!
  }
  persist()
}

function applyHint(): void {
  const g = game.value
  const h = hint.value
  if (!g || !h) return
  doPour(g, h.from, h.to)
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
  const timeMs = Math.round(stopwatch.elapsedMs.value)
  const { newBestTime } = recordFinish('watersort', g.puzzle.difficulty, { timeMs })
  remove(SAVE_KEY)
  result.value = { timeMs, newBest: newBestTime }
  // Let the last pour finish (and the cork pop on) before the dialog opens.
  resultTimer = setTimeout(() => (showResult.value = true), motionEnabled.value ? 2200 : 0)
}

const resultRows = computed(() => {
  const g = game.value
  if (!g || !result.value) return []
  return [
    { label: t('common.difficulty'), value: t(`difficulty.${g.puzzle.difficulty}`) },
    { label: t('common.size'), value: sizeLabel(g.puzzle.difficulty) },
    { label: t('common.time'), value: formatDuration(result.value.timeMs), highlight: result.value.newBest },
    { label: t('watersort.play.moves'), value: String(g.moves) },
    { label: t('common.hints'), value: String(g.hintsUsed) },
  ]
})

function playAgain(): void {
  showResult.value = false
  startNew(game.value?.puzzle.difficulty ?? 'easy')
}

function goToMenu(): void {
  showResult.value = false
  void returnTo(router, { name: 'watersort' })
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
  void router.replace({ name: 'watersort' })
}
</script>

<template>
  <AppBar :title="t('watersort.name')" back-to="/watersort">
    <template #actions>
      <span class="timer tabular" :aria-label="t('common.time')">
        <AppIcon name="clock" :size="18" />
        {{ formatDuration(stopwatch.elapsedMs.value) }}
      </span>
      <button type="button" class="icon-btn" :aria-label="t('watersort.play.rules')" @click="showRules = true">
        <AppIcon name="info" />
      </button>
    </template>
  </AppBar>

  <main v-if="game" class="play">
    <GameBackdrop game="watersort" />
    <div class="info" aria-live="polite">
      <p v-if="hint" class="info__hint">
        <strong>{{ t('watersort.play.hint') }}:</strong>
        {{ t('watersort.play.hintMove', { from: hint.from + 1, to: hint.to + 1 }) }}
      </p>
      <div v-else class="hud tabular">
        <div class="hud__item">
          <span class="hud__label">{{ t('common.difficulty') }}</span>
          <span class="hud__value hud__value--level">{{ levelLabel }}</span>
        </div>
        <div class="hud__item">
          <span class="hud__label">{{ t('watersort.play.moves') }}</span>
          <span class="hud__value">{{ game.moves }}</span>
        </div>
        <div class="hud__item">
          <span class="hud__label">{{ t('watersort.play.sorted') }}</span>
          <span class="hud__value">{{ sorted }} / {{ game.puzzle.colors }}</span>
        </div>
      </div>
    </div>

    <div class="board-wrap">
      <WaterSortBoard
        :tubes="game.tubes"
        :selected="selected"
        :hint="hint"
        :poured="poured"
        :refused="refused"
        :symbols="waterSortSettings.showSymbols"
        :disabled="status !== 'playing'"
        @select="onSelect"
      />
    </div>

    <div v-if="hint" class="toolbar">
      <AppButton
        class="toolbar__icon"
        icon="close"
        :aria-label="t('common.close')"
        :title="t('common.close')"
        @click="hint = null"
      />
      <AppButton variant="primary" @click="applyHint">{{ t('common.apply') }}</AppButton>
    </div>
    <div v-else class="toolbar">
      <AppButton icon="undo" :disabled="!canUndo" @click="undo">{{ t('watersort.play.undo') }}</AppButton>
      <AppButton icon="hint" :disabled="status !== 'playing'" @click="requestHint">{{ t('common.hint') }}</AppButton>
      <AppButton
        class="toolbar__icon"
        icon="restart"
        :disabled="status !== 'playing'"
        :aria-label="t('watersort.play.restart')"
        :title="t('watersort.play.restart')"
        @click="confirmRestart = true"
      />
    </div>
  </main>

  <AppDialog :open="showRules" :title="t('watersort.rules.title')" @close="showRules = false">
    <WaterSortRules />
  </AppDialog>

  <ConfirmDialog
    :open="confirmRestart"
    :message="t('watersort.play.restartConfirm')"
    :confirm-label="t('watersort.play.restart')"
    danger
    @confirm="confirmedRestart"
    @cancel="confirmRestart = false"
  />

  <ResultDialog
    :open="showResult"
    :title="t('common.solved')"
    :share="result && game ? { game: 'watersort', variant: game.puzzle.difficulty, result: formatDuration(result.timeMs), kind: 'time', newBest: result.newBest } : undefined"
    :subtitle="t('watersort.result.solvedText')"
    :rows="resultRows"
    :badge="result?.newBest ? t('common.newBest') : undefined"
  >
    <template #actions>
      <AppButton variant="primary" block @click="playAgain">{{ t('common.newGame') }}</AppButton>
      <AppButton block @click="goToMenu">{{ t('watersort.play.toMenu') }}</AppButton>
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

.info {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 52px;
  flex: none;
}

.info__hint {
  font-size: var(--text-sm);
  text-align: center;
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
  color: var(--game-watersort);
}

.board-wrap {
  display: flex;
  flex: 1;
  align-items: center;
  width: 100%;
  max-width: 460px;
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
