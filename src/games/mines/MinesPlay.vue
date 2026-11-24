<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, toRaw, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AppBar from '@/components/AppBar.vue'
import AppButton from '@/components/AppButton.vue'
import AppDialog from '@/components/AppDialog.vue'
import AppIcon from '@/components/AppIcon.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import LoadingOverlay from '@/components/LoadingOverlay.vue'
import ResultDialog from '@/components/ResultDialog.vue'
import { checkMessage } from '@/core/check'
import { formatDuration } from '@/core/format'
import { t } from '@/core/i18n'
import { returnTo } from '@/core/navigation'
import { recordFinish, recordStart } from '@/core/stats'
import { load, remove, save } from '@/core/storage'
import { motionEnabled } from '@/core/theme'
import { useStopwatch } from '@/core/timer'
import { showToast } from '@/core/toast'
import { DIFFICULTIES, SAVE_KEY, type Difficulty } from './index'
import { puzzleInfo } from './logic/board'
import { applyHint, getHint, type Hint } from './logic/hints'
import {
  chord,
  flagAllMines,
  initialCells,
  isMineCell,
  isSolved,
  minesLeft,
  reveal,
  toggleFlag,
  wrongFlags,
  type MoveResult,
} from './logic/rules'
import { FLAGGED, REVEALED, isMinesSave, type CellState, type MinesPuzzle, type MinesSave } from './logic/types'
import MinesBoard from './MinesBoard.vue'
import MinesRules from './MinesRules.vue'
import { minesPool } from './pool'
import { minesSettings } from './settings'

const route = useRoute()
const router = useRouter()

type Status = 'loading' | 'playing' | 'lost' | 'won'
type Tool = 'reveal' | 'flag'

const status = ref<Status>('loading')
const game = ref<MinesSave | null>(null)
const stopwatch = useStopwatch(0)
const tool = ref<Tool>('reveal')

const puzzle = computed(() => game.value?.puzzle ?? null)
const counts = computed(() => (puzzle.value ? puzzleInfo(puzzle.value).counts : new Int8Array()))
const left = computed(() => (game.value ? minesLeft(game.value.puzzle, game.value.cells) : 0))

/** "Easy · 8×10" – shown in the HUD (the app bar is too narrow for it on phones). */
const levelLabel = computed(() =>
  puzzle.value
    ? t('mines.variantLabel', {
        difficulty: t(`difficulty.${puzzle.value.difficulty}`),
        size: t('mines.boardLabel', { width: puzzle.value.width, height: puzzle.value.height }),
      })
    : '',
)

/** All mines after a hit. */
const shownMines = computed(() =>
  status.value === 'lost' && puzzle.value ? new Set(puzzle.value.mines) : null,
)

/** Wrong flags shown: all of them in instant mode or after a hit, else those found by "Check". */
const wrong = computed(() => {
  const g = game.value
  if (!g) return null
  if (minesSettings.value.instantMistakes || status.value === 'lost') return new Set(wrongFlags(g.puzzle, g.cells))
  const checked = (g.checked ?? []).filter((cell) => g.cells[cell] === FLAGGED && !isMineCell(g.puzzle, cell))
  return checked.length ? new Set(checked) : null
})

// --- Persistence ------------------------------------------------------------------

/** Saves the attempt – but only once the player actually did something. */
function persist(): void {
  const g = game.value
  if (!g || g.actions === 0 || (status.value !== 'playing' && status.value !== 'lost')) return
  save(SAVE_KEY, { ...toRaw(g), elapsedMs: Math.round(stopwatch.elapsedMs.value) })
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

function freshAttempt(next: MinesPuzzle): MinesSave {
  return { puzzle: next, cells: initialCells(next), actions: 0, elapsedMs: 0, hintsUsed: 0, mistakes: 0 }
}

function resetView(): void {
  hint.value = null
  result.value = null
  showResult.value = false
  showHit.value = false
}

async function startNew(difficulty: Difficulty): Promise<void> {
  const token = ++startToken
  status.value = 'loading'
  resetView()
  stopwatch.reset(0)
  // The player confirmed a new board: the old save is gone. Drop ?new= before awaiting.
  remove(SAVE_KEY)
  void router.replace({ name: 'mines-play' })
  const next = await minesPool.take(difficulty)
  if (token !== startToken) return
  game.value = freshAttempt(next)
  tool.value = 'reveal'
  status.value = 'playing'
  stopwatch.start()
}

/** Starts the same board again (after a mine hit or via Restart). */
function restartAttempt(): void {
  if (!game.value) return
  resetView()
  remove(SAVE_KEY)
  game.value = freshAttempt(game.value.puzzle)
  tool.value = 'reveal'
  status.value = 'playing'
  stopwatch.reset(0)
  stopwatch.start()
}

function resume(): boolean {
  const saved = load(SAVE_KEY, null, (raw) => (isMinesSave(raw) ? raw : undefined))
  if (!saved) return false
  game.value = saved
  stopwatch.reset(saved.elapsedMs)
  if (saved.hit !== undefined) {
    status.value = 'lost'
    showHit.value = true
  } else {
    status.value = 'playing'
    stopwatch.start()
  }
  return true
}

// --- Playing -----------------------------------------------------------------------

/** Counts the move; the first move of an attempt starts the statistics entry. */
function countAction(g: MinesSave): void {
  if (g.actions === 0) recordStart('mines', g.puzzle.difficulty)
  g.actions += 1
}

function applyResult(g: MinesSave, outcome: MoveResult): void {
  if (outcome.kind === 'none') return
  countAction(g)
  hint.value = null
  if (outcome.kind === 'hit') {
    g.before = g.cells
    g.cells = outcome.cells
    g.hit = outcome.mine
    stopwatch.pause()
    status.value = 'lost'
    persist()
    later(() => (showHit.value = true), motionEnabled.value ? 700 : 0)
    return
  }
  g.cells = outcome.cells
  if (isSolved(g.puzzle, g.cells)) win()
  else persist()
}

function act(cell: number, action: Tool): void {
  const g = game.value
  if (!g || status.value !== 'playing') return
  const state = g.cells[cell]
  if (state === REVEALED) {
    if (minesSettings.value.chord) applyResult(g, chord(g.puzzle, g.cells, cell))
    return
  }
  if (action === 'reveal') {
    applyResult(g, reveal(g.puzzle, g.cells, cell))
    return
  }
  const next = toggleFlag(g.cells, cell)
  if (!next) return
  countAction(g)
  hint.value = null
  if (next[cell] === FLAGGED && minesSettings.value.instantMistakes && !isMineCell(g.puzzle, cell)) {
    g.mistakes += 1
  }
  g.cells = next
  persist()
}

const other = (action: Tool): Tool => (action === 'reveal' ? 'flag' : 'reveal')

function onTap(cell: number): void {
  act(cell, tool.value)
}

function onAlt(cell: number): void {
  act(cell, other(tool.value))
}

function onFlag(cell: number): void {
  act(cell, 'flag')
}

// --- Mine hit ----------------------------------------------------------------------

const showHit = ref(false)

/** Back to the board before the fatal move – counts as a mistake. */
function undoHit(): void {
  const g = game.value
  if (!g || g.hit === undefined || !g.before) return
  showHit.value = false
  g.cells = g.before
  delete g.hit
  delete g.before
  g.mistakes += 1
  status.value = 'playing'
  stopwatch.start()
  persist()
}

function tryAgain(): void {
  showHit.value = false
  restartAttempt()
}

// --- Check -----------------------------------------------------------------------------

/**
 * Highlights the wrong flags and counts the ones an earlier check has not counted yet
 * (checking twice without changes does not count a mistake twice).
 */
function check(): void {
  const g = game.value
  if (!g || status.value !== 'playing') return
  hint.value = null
  const found = wrongFlags(g.puzzle, g.cells)
  const counted = new Set(g.checked ?? [])
  g.mistakes += found.filter((cell) => !counted.has(cell)).length
  g.checked = found
  persist()
  showToast(checkMessage(found.length))
}

// --- Hints -----------------------------------------------------------------------------

const hint = shallowRef<Hint | null>(null)

function position(cell: number): { row: number; col: number } {
  const width = puzzle.value?.width ?? 1
  return { row: Math.floor(cell / width) + 1, col: (cell % width) + 1 }
}

const hintTitle = computed(() =>
  hint.value?.kind === 'wrong' ? t('mines.hint.wrongTitle') : t('mines.hint.title'),
)

const hintText = computed(() => {
  const h = hint.value
  const g = game.value
  if (!h || !g) return ''
  if (h.kind === 'wrong') return t('mines.hint.wrong')
  if (h.kind !== 'step') return ''
  const { step } = h
  const what =
    step.safe.length && step.mines.length
      ? t('mines.hint.both')
      : step.safe.length
        ? t('mines.hint.safe')
        : t('mines.hint.mines')
  const number = (cell: number) => counts.value[cell]!
  switch (step.technique) {
    case 1: {
      const source = step.sources[0]!
      const params = { number: number(source), ...position(source), count: step.mines.length }
      return step.safe.length ? t('mines.hint.singleSafe', params) : t('mines.hint.singleMines', params)
    }
    case 2: {
      const [a, b] = step.sources as [number, number]
      const pa = position(a)
      const pb = position(b)
      return t('mines.hint.pair', { a: number(a), r1: pa.row, c1: pa.col, b: number(b), r2: pb.row, c2: pb.col, what })
    }
    case 3:
      return t('mines.hint.group', { what })
    default:
      return t('mines.hint.count', { left: left.value, what })
  }
})

const hintSources = computed(() => (hint.value?.kind === 'step' ? new Set(hint.value.step.sources) : null))
const hintSafe = computed(() => (hint.value?.kind === 'step' ? new Set(hint.value.step.safe) : null))
const hintMines = computed(() => {
  const h = hint.value
  if (h?.kind === 'step') return new Set(h.step.mines)
  if (h?.kind === 'wrong') return new Set(h.cells)
  return null
})

function requestHint(): void {
  const g = game.value
  if (!g || status.value !== 'playing') return
  const next = getHint(g.puzzle, g.cells)
  if (next.kind === 'none') {
    showToast(t('mines.play.noHint'))
    return
  }
  hint.value = next
  g.hintsUsed += 1
  persist()
}

function applyCurrentHint(): void {
  const g = game.value
  const h = hint.value
  if (!g || !h) return
  hint.value = null
  const next = applyHint(g.puzzle, g.cells, h)
  countAction(g)
  g.cells = next
  if (isSolved(g.puzzle, g.cells)) win()
  else persist()
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
  hint.value = null
  g.cells = flagAllMines(g.puzzle, g.cells) as CellState[]
  const timeMs = Math.round(stopwatch.elapsedMs.value)
  const { newBestTime } = recordFinish('mines', g.puzzle.difficulty, { timeMs })
  remove(SAVE_KEY)
  result.value = { timeMs, newBest: newBestTime }
  // Show the finished board before the dialog covers it.
  later(() => (showResult.value = true), motionEnabled.value ? 900 : 0)
}

const resultRows = computed(() => {
  const g = game.value
  if (!g || !result.value) return []
  const p = g.puzzle
  return [
    { label: t('common.difficulty'), value: t(`difficulty.${p.difficulty}`) },
    { label: t('common.size'), value: t('mines.sizeLabel', { width: p.width, height: p.height, mines: p.mines.length }) },
    { label: t('common.time'), value: formatDuration(result.value.timeMs), highlight: result.value.newBest },
    { label: t('mines.result.mistakes'), value: String(g.mistakes) },
    { label: t('common.hints'), value: String(g.hintsUsed) },
  ]
})

const hitRows = computed(() => {
  const g = game.value
  if (!g) return []
  return [
    { label: t('common.time'), value: formatDuration(stopwatch.elapsedMs.value) },
    { label: t('mines.result.mistakes'), value: String(g.mistakes) },
  ]
})

function newPuzzle(): void {
  showResult.value = false
  showHit.value = false
  void startNew(game.value?.puzzle.difficulty ?? 'easy')
}

function goToMenu(): void {
  showResult.value = false
  void returnTo(router, { name: 'mines' })
}

function goHome(): void {
  showResult.value = false
  showHit.value = false
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
  void router.replace({ name: 'mines' })
}
</script>

<template>
  <AppBar :title="t('mines.name')" back-to="/mines">
    <template #actions>
      <span v-if="status !== 'loading'" class="timer tabular" :aria-label="t('common.time')">
        <AppIcon name="clock" :size="18" />
        {{ formatDuration(stopwatch.elapsedMs.value) }}
      </span>
      <button type="button" class="icon-btn" :aria-label="t('mines.play.rules')" @click="showRules = true">
        <AppIcon name="info" />
      </button>
    </template>
  </AppBar>

  <main class="play">
    <LoadingOverlay v-if="status === 'loading' || !game" :label="t('common.generating')" />

    <template v-else>
      <div class="info" aria-live="polite">
        <p v-if="hint && hint.kind !== 'none'" class="info__hint">
          <strong>{{ hintTitle }}:</strong> {{ hintText }}
        </p>
        <div v-else class="hud tabular">
          <div class="hud__item">
            <span class="hud__label">{{ t('common.difficulty') }}</span>
            <span class="hud__value hud__value--level">{{ levelLabel }}</span>
          </div>
          <div class="hud__item" :aria-label="t('mines.play.minesLeftValue', { count: left })">
            <span class="hud__label">{{ t('mines.play.minesLeft') }}</span>
            <span class="hud__value">{{ left }}</span>
          </div>
          <div class="hud__item">
            <span class="hud__label">{{ t('mines.play.mistakes') }}</span>
            <span class="hud__value">{{ game.mistakes }}</span>
          </div>
        </div>
      </div>

      <div class="board-wrap" :style="{ '--ratio': game.puzzle.width / game.puzzle.height }">
        <MinesBoard
          :width="game.puzzle.width"
          :height="game.puzzle.height"
          :cells="game.cells"
          :counts="counts"
          :mines="shownMines"
          :hit="game.hit ?? null"
          :wrong="wrong"
          :hint-sources="hintSources"
          :hint-safe="hintSafe"
          :hint-mines="hintMines"
          :long-press="minesSettings.longPress"
          :disabled="status !== 'playing'"
          :solved="status === 'won'"
          @tap="onTap"
          @alt="onAlt"
          @flag="onFlag"
        />
      </div>

      <div v-if="hint && hint.kind !== 'none'" class="toolbar">
        <AppButton
          class="toolbar__icon"
          icon="close"
          :aria-label="t('common.close')"
          :title="t('common.close')"
          @click="hint = null"
        />
        <AppButton variant="primary" @click="applyCurrentHint">
          {{ hint.kind === 'wrong' ? t('mines.hint.removeWrong') : t('common.apply') }}
        </AppButton>
      </div>
      <div v-else class="toolbar">
        <div class="tools" role="radiogroup" :aria-label="t('mines.play.tool')">
          <button
            type="button"
            role="radio"
            class="tool"
            :class="{ 'tool--active': tool === 'reveal' }"
            :aria-checked="tool === 'reveal'"
            @click="tool = 'reveal'"
          >
            <span class="tool__swatch" aria-hidden="true" />
            {{ t('mines.play.reveal') }}
          </button>
          <button
            type="button"
            role="radio"
            class="tool"
            :class="{ 'tool--active': tool === 'flag' }"
            :aria-checked="tool === 'flag'"
            @click="tool = 'flag'"
          >
            <svg class="tool__flag" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 3.5v17M4.5 20.5h7" />
              <path class="tool__cloth" d="M8 4.2l10 4.3-10 4.3z" />
            </svg>
            {{ t('mines.play.flag') }}
          </button>
        </div>
        <AppButton
          v-if="!minesSettings.instantMistakes"
          class="toolbar__icon"
          icon="inspect"
          :disabled="status !== 'playing'"
          :aria-label="t('common.check')"
          :title="t('common.check')"
          @click="check"
        />
        <AppButton
          class="toolbar__icon"
          icon="hint"
          :disabled="status !== 'playing'"
          :aria-label="t('common.hint')"
          :title="t('common.hint')"
          @click="requestHint"
        />
        <AppButton
          class="toolbar__icon"
          icon="restart"
          :disabled="status !== 'playing'"
          :aria-label="t('mines.play.restart')"
          :title="t('mines.play.restart')"
          @click="confirmRestart = true"
        />
      </div>
    </template>
  </main>

  <AppDialog :open="showRules" :title="t('mines.rules.title')" @close="showRules = false">
    <MinesRules />
  </AppDialog>

  <ConfirmDialog
    :open="confirmRestart"
    :message="t('mines.play.restartConfirm')"
    :confirm-label="t('mines.play.restart')"
    danger
    @confirm="confirmedRestart"
    @cancel="confirmRestart = false"
  />

  <ResultDialog
    :open="showHit"
    :title="t('mines.result.hitTitle')"
    :subtitle="t('mines.result.hitText')"
    :rows="hitRows"
    icon="restart"
  >
    <template #actions>
      <AppButton variant="primary" icon="undo" block @click="undoHit">{{ t('mines.result.undoMove') }}</AppButton>
      <AppButton block @click="tryAgain">{{ t('mines.result.tryAgain') }}</AppButton>
      <AppButton block @click="newPuzzle">{{ t('mines.result.newPuzzle') }}</AppButton>
      <AppButton variant="ghost" icon="home" block @click="goHome">{{ t('common.home') }}</AppButton>
    </template>
  </ResultDialog>

  <ResultDialog
    :open="showResult"
    :title="t('common.solved')"
    :subtitle="t('mines.result.solvedText')"
    :rows="resultRows"
    :badge="result?.newBest ? t('common.newBest') : undefined"
  >
    <template #actions>
      <AppButton variant="primary" block @click="newPuzzle">{{ t('common.newGame') }}</AppButton>
      <AppButton block @click="goToMenu">{{ t('mines.play.toMenu') }}</AppButton>
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
  gap: var(--space-2);
  width: 100%;
  max-width: var(--content-max);
  min-height: 0;
  margin: 0 auto;
  padding: var(--space-1) max(var(--space-3), env(safe-area-inset-right))
    max(var(--space-3), env(safe-area-inset-bottom)) max(var(--space-3), env(safe-area-inset-left));
}

.timer {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 0 var(--space-2);
  font-weight: 600;
  color: var(--color-text-muted);
}

/* Fixed height so the board does not jump when a hint is shown. */
.info {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 52px;
  flex: none;
}

.info__hint {
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  font-size: var(--text-xs);
  line-height: 1.35;
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
  color: var(--game-mines);
}

.board-wrap {
  /* Width-bound on phones, height-bound on short screens (keeps the board's aspect ratio). */
  width: min(
    100%,
    520px,
    calc((100dvh - 230px - env(safe-area-inset-top) - env(safe-area-inset-bottom)) * var(--ratio))
  );
  min-width: min(100%, 220px);
}

.toolbar {
  display: flex;
  flex: none;
  gap: var(--space-2);
  justify-content: center;
  width: 100%;
}

.toolbar > * {
  flex: 1;
  max-width: 260px;
}

.toolbar > .toolbar__icon {
  flex: none;
  width: var(--tap-min);
  padding: 0;
}

.tools {
  display: flex;
  gap: 2px;
  padding: 3px;
  border-radius: var(--radius-md);
  background: var(--color-surface-2);
}

.tool {
  display: inline-flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  min-height: 38px;
  padding: 0 var(--space-2);
  border: 0;
  border-radius: calc(var(--radius-md) - 3px);
  background: transparent;
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  font-weight: 700;
  cursor: pointer;
}

.tool--active {
  background: var(--color-surface);
  color: var(--color-text);
  box-shadow: var(--shadow-sm);
}

.tool__swatch {
  width: 14px;
  height: 14px;
  border: 1px solid var(--color-border);
  border-radius: 3px;
  background: var(--color-surface);
}

.tool__flag {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentcolor;
  stroke-width: 2;
  stroke-linecap: round;
}

.tool__cloth {
  fill: var(--color-error);
  stroke: var(--color-error);
  stroke-width: 1.2;
  stroke-linejoin: round;
}
</style>
