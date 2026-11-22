<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, toRaw, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AppBar from '@/components/AppBar.vue'
import GameSettingsButton from '@/components/GameSettingsButton.vue'
import AppButton from '@/components/AppButton.vue'
import AppDialog from '@/components/AppDialog.vue'
import AppIcon from '@/components/AppIcon.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import LoadingOverlay from '@/components/LoadingOverlay.vue'
import ResultDialog from '@/components/ResultDialog.vue'
import { formatDuration } from '@/core/format'
import { t } from '@/core/i18n'
import { returnTo } from '@/core/navigation'
import { recordFinish, recordStart } from '@/core/stats'
import { load, remove, save } from '@/core/storage'
import { motionEnabled } from '@/core/theme'
import { useStopwatch } from '@/core/timer'
import { showToast } from '@/core/toast'
import ArrowsBoard, { type Bump, type LeavingArrow } from './ArrowsBoard.vue'
import ArrowsRules from './ArrowsRules.vue'
import { DIFFICULTIES, SAVE_KEY, type Difficulty } from './index'
import { arrowAt, hintArrow, tapArrow } from './logic/rules'
import { LIVES, isArrowsSave, type ArrowsPuzzle, type ArrowsSave } from './logic/types'
import { arrowsPool } from './pool'
import { arrowsSettings } from './settings'

const route = useRoute()
const router = useRouter()

type Status = 'loading' | 'playing' | 'won' | 'failed'

/** Duration of the slide-out animation (ms). */
const LEAVE_MS = 280

const status = ref<Status>('loading')
const game = ref<ArrowsSave | null>(null)
const stopwatch = useStopwatch(0)

// The clock stops while the settings dialog covers the board.
const settingsOpen = ref(false)
watch(settingsOpen, (open) => {
  if (status.value !== 'playing') return
  if (open) stopwatch.pause()
  else stopwatch.start()
})
const leaving = ref<LeavingArrow[]>([])
const bump = ref<Bump | null>(null)
const highlight = ref<number | null>(null)

const puzzle = computed(() => game.value?.puzzle ?? null)
const arrowsLeft = computed(() =>
  game.value ? game.value.puzzle.arrows.length - game.value.removed.length : 0,
)
/** "Easy · 6×6" – shown in the HUD (the app bar is too narrow for it on phones). */
const levelLabel = computed(() =>
  puzzle.value
    ? t('arrows.variantLabel', {
        difficulty: t(`difficulty.${puzzle.value.difficulty}`),
        size: t('arrows.sizeLabel', { size: puzzle.value.size }),
      })
    : '',
)

// --- Persistence ------------------------------------------------------------------

/** Saves the attempt – but only once the player actually did something. */
function persist(): void {
  if (!game.value || status.value !== 'playing' || game.value.actions === 0) return
  save(SAVE_KEY, { ...toRaw(game.value), elapsedMs: Math.round(stopwatch.elapsedMs.value) })
}

function onVisibilityChange(): void {
  if (document.hidden) persist()
}

let autosave: ReturnType<typeof setInterval> | undefined
const timers = new Set<ReturnType<typeof setTimeout>>()

function later(fn: () => void, ms: number): void {
  const id = setTimeout(() => {
    timers.delete(id)
    fn()
  }, ms)
  timers.add(id)
}

onMounted(() => {
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('pagehide', persist)
  autosave = setInterval(persist, 5000)
})

onBeforeUnmount(() => {
  startToken++ // invalidate a generation that is still running
  persist()
  clearInterval(autosave)
  for (const id of timers) clearTimeout(id)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  window.removeEventListener('pagehide', persist)
})

// --- Starting / resuming ------------------------------------------------------------

let startToken = 0

function freshAttempt(next: ArrowsPuzzle): ArrowsSave {
  return { puzzle: next, removed: [], lives: LIVES, actions: 0, elapsedMs: 0, hintsUsed: 0 }
}

function resetView(): void {
  leaving.value = []
  bump.value = null
  highlight.value = null
  result.value = null
  showResult.value = false
}

async function startNew(difficulty: Difficulty): Promise<void> {
  const token = ++startToken
  status.value = 'loading'
  resetView()
  stopwatch.reset(0)
  // The player confirmed a new puzzle: the old save is gone. Drop ?new= before awaiting.
  remove(SAVE_KEY)
  void router.replace({ name: 'arrows-play' })
  const next = await arrowsPool.take(difficulty)
  if (token !== startToken) return
  game.value = freshAttempt(next)
  status.value = 'playing'
  stopwatch.start()
}

/** Starts the same puzzle again (after a failure or via Restart). */
function restartAttempt(): void {
  if (!game.value) return
  resetView()
  remove(SAVE_KEY)
  game.value = freshAttempt(game.value.puzzle)
  status.value = 'playing'
  stopwatch.reset(0)
  stopwatch.start()
}

function resume(): boolean {
  const saved = load(SAVE_KEY, null, (raw) => (isArrowsSave(raw) ? raw : undefined))
  if (!saved) return false
  game.value = saved
  stopwatch.reset(saved.elapsedMs)
  status.value = 'playing'
  stopwatch.start()
  return true
}

// --- Playing -----------------------------------------------------------------------

let animationKey = 0

function onTap(cell: number): void {
  const current = game.value
  if (!current || status.value !== 'playing') return
  const id = arrowAt(current.puzzle, current.removed, cell)
  if (id < 0) return
  const outcome = tapArrow(current.puzzle, current, id)
  if (outcome.kind === 'none') return

  if (current.actions === 0) recordStart('arrows', current.puzzle.difficulty)
  current.actions += 1
  highlight.value = null

  if (outcome.kind === 'exit') {
    current.removed = outcome.state.removed
    const key = ++animationKey
    leaving.value = [...leaving.value, { id, key }]
    later(() => (leaving.value = leaving.value.filter((entry) => entry.key !== key)), motionEnabled.value ? LEAVE_MS : 0)
    if (outcome.solved) win()
    else persist()
    return
  }

  current.lives = outcome.state.lives
  bump.value = { arrow: id, blocker: outcome.blocker, key: ++animationKey }
  const bumpKey = bump.value.key
  later(() => {
    if (bump.value?.key === bumpKey) bump.value = null
  }, 900)
  if (outcome.failed) fail()
  else {
    showToast(t('arrows.play.blocked'))
    persist()
  }
}

// --- Hints -----------------------------------------------------------------------------

function requestHint(): void {
  if (!game.value || status.value !== 'playing') return
  const id = hintArrow(game.value.puzzle, game.value.removed)
  if (id === null) return
  highlight.value = id
  game.value.hintsUsed += 1
  showToast(t('arrows.play.hintShown'))
  persist()
}

// --- Restart -------------------------------------------------------------------------

const confirmRestart = ref(false)

function confirmedRestart(): void {
  confirmRestart.value = false
  restartAttempt()
}

// --- End of an attempt ------------------------------------------------------------

const result = ref<{ timeMs: number; newBest: boolean } | null>(null)
const showResult = ref(false)

function win(): void {
  if (!game.value) return
  stopwatch.pause()
  status.value = 'won'
  const timeMs = Math.round(stopwatch.elapsedMs.value)
  const { newBestTime } = recordFinish('arrows', game.value.puzzle.difficulty, { timeMs })
  remove(SAVE_KEY)
  result.value = { timeMs, newBest: newBestTime }
  later(() => (showResult.value = true), motionEnabled.value ? LEAVE_MS + 300 : 0)
}

function fail(): void {
  if (!game.value) return
  stopwatch.pause()
  status.value = 'failed'
  remove(SAVE_KEY)
  result.value = { timeMs: Math.round(stopwatch.elapsedMs.value), newBest: false }
  later(() => (showResult.value = true), motionEnabled.value ? 700 : 0)
}

const resultRows = computed(() => {
  if (!game.value || !result.value) return []
  const p = game.value.puzzle
  const rows = [
    { label: t('common.difficulty'), value: t(`difficulty.${p.difficulty}`) },
    { label: t('common.size'), value: t('arrows.sizeLabel', { size: p.size }) },
    { label: t('common.time'), value: formatDuration(result.value.timeMs), highlight: result.value.newBest },
  ]
  if (status.value === 'won') {
    rows.push({ label: t('arrows.result.livesLeft'), value: `${game.value.lives} / ${LIVES}`, highlight: false })
  } else {
    rows.push({ label: t('arrows.result.arrowsLeft'), value: String(arrowsLeft.value), highlight: false })
  }
  rows.push({ label: t('common.hints'), value: String(game.value.hintsUsed), highlight: false })
  return rows
})

function newPuzzle(): void {
  showResult.value = false
  void startNew(game.value?.puzzle.difficulty ?? 'easy')
}

function tryAgain(): void {
  showResult.value = false
  restartAttempt()
}

function goToMenu(): void {
  showResult.value = false
  void returnTo(router, { name: 'arrows' })
}

function goHome(): void {
  showResult.value = false
  void returnTo(router, { name: 'home' })
}

const showRules = ref(false)

// Start a new game (?new=<difficulty>) or resume the saved one.
watch(
  () => route.query.new,
  (value) => {
    if (typeof value === 'string' && (DIFFICULTIES as readonly string[]).includes(value)) {
      void startNew(value as Difficulty)
    }
  },
  { immediate: true },
)

if (typeof route.query.new !== 'string' && !resume()) {
  void router.replace({ name: 'arrows' })
}
</script>

<template>
  <AppBar :title="t('arrows.name')" back-to="/arrows">
    <template #actions>
      <GameSettingsButton game="arrows" @open="settingsOpen = true" @close="settingsOpen = false" />
      <span v-if="status !== 'loading'" class="timer tabular" :aria-label="t('common.time')">
        <AppIcon name="clock" :size="18" />
        {{ formatDuration(stopwatch.elapsedMs.value) }}
      </span>
      <button type="button" class="icon-btn" :aria-label="t('arrows.play.rules')" @click="showRules = true">
        <AppIcon name="info" />
      </button>
    </template>
  </AppBar>

  <main class="play">
    <LoadingOverlay v-if="status === 'loading' || !game" :label="t('common.generating')" />

    <template v-else>
      <div class="hud tabular">
        <div class="hud__item">
          <span class="hud__label">{{ t('common.difficulty') }}</span>
          <span class="hud__value hud__value--level">{{ levelLabel }}</span>
        </div>
        <div class="hud__item" :aria-label="t('arrows.play.livesValue', { lives: game.lives, max: LIVES })">
          <span class="hud__label">{{ t('arrows.play.lives') }}</span>
          <span class="hearts" aria-hidden="true">
            <svg
              v-for="i in LIVES"
              :key="i"
              class="heart"
              :class="{ 'heart--lost': i > game.lives }"
              viewBox="0 0 24 24"
            >
              <path d="M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.6 4 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.2 0 5.6 3.1 4.4 6.6-1.7 4.8-9.2 9.4-9.2 9.4z" />
            </svg>
          </span>
        </div>
        <div class="hud__item">
          <span class="hud__label">{{ t('arrows.play.left') }}</span>
          <span class="hud__value">{{ arrowsLeft }}</span>
        </div>
      </div>

      <div class="board-wrap">
        <ArrowsBoard
          :size="game.puzzle.size"
          :arrows="game.puzzle.arrows"
          :removed="game.removed"
          :leaving="leaving"
          :bump="bump"
          :highlight="highlight"
          :show-blocked-path="arrowsSettings.showBlockedPath"
          :disabled="status !== 'playing'"
          @tap="onTap"
        />
      </div>

      <div class="toolbar">
        <AppButton icon="hint" :disabled="status !== 'playing'" @click="requestHint">
          {{ t('common.hint') }}
        </AppButton>
        <AppButton icon="restart" :disabled="status !== 'playing'" @click="confirmRestart = true">
          {{ t('arrows.play.restart') }}
        </AppButton>
      </div>
    </template>
  </main>

  <AppDialog :open="showRules" :title="t('arrows.rules.title')" @close="showRules = false">
    <ArrowsRules />
  </AppDialog>

  <ConfirmDialog
    :open="confirmRestart"
    :message="t('arrows.play.restartConfirm')"
    :confirm-label="t('arrows.play.restart')"
    danger
    @confirm="confirmedRestart"
    @cancel="confirmRestart = false"
  />

  <ResultDialog
    :open="showResult"
    :title="status === 'won' ? t('common.solved') : t('arrows.result.failedTitle')"
    :subtitle="status === 'won' ? t('arrows.result.solvedText') : t('arrows.result.failedText')"
    :rows="resultRows"
    :badge="result?.newBest ? t('common.newBest') : undefined"
    :icon="status === 'won' ? 'trophy' : 'restart'"
  >
    <template #actions>
      <template v-if="status === 'won'">
        <AppButton variant="primary" block @click="newPuzzle">{{ t('common.newGame') }}</AppButton>
        <AppButton block @click="goToMenu">{{ t('arrows.play.toMenu') }}</AppButton>
      </template>
      <template v-else>
        <AppButton variant="primary" block @click="tryAgain">{{ t('arrows.result.tryAgain') }}</AppButton>
        <AppButton block @click="newPuzzle">{{ t('arrows.result.newPuzzle') }}</AppButton>
      </template>
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
  color: var(--game-arrows);
}

.hearts {
  display: flex;
  gap: 2px;
  height: 28px;
  align-items: center;
}

.heart {
  width: 22px;
  height: 22px;
  fill: var(--color-error);
  transition:
    opacity var(--dur-med),
    transform var(--dur-med) var(--ease-out);
}

.heart--lost {
  fill: var(--color-surface-3);
  transform: scale(0.85);
}

.board-wrap {
  /* Width-bound on phones, height-bound on short screens. */
  width: min(100%, 520px, calc(100dvh - 270px - env(safe-area-inset-top) - env(safe-area-inset-bottom)));
  min-width: min(100%, 260px);
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
</style>
