<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'

import AppButton from '@/components/AppButton.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import GameBackdrop from '@/components/GameBackdrop.vue'
import LoadingOverlay from '@/components/LoadingOverlay.vue'
import PlayBar from '@/components/PlayBar.vue'
import ResultDialog from '@/components/ResultDialog.vue'
import SegmentedControl from '@/components/SegmentedControl.vue'
import { checkMessage } from '@/core/check'
import { formatDuration } from '@/core/format'
import { t } from '@/core/i18n'
import { motionEnabled } from '@/core/theme'
import { showToast } from '@/core/toast'
import { usePuzzleSession } from '@/core/usePuzzleSession'
import { DIFFICULTIES, saveSlot } from './index'
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
import { FLAGGED, REVEALED, type MinesPuzzle, type MinesSave } from './logic/types'
import MinesBoard from './MinesBoard.vue'
import MinesRules from './MinesRules.vue'
import { minesPool } from './pool'
import { minesSettings } from './settings'

type Tool = 'reveal' | 'flag'

const tool = ref<Tool>('reveal')
const toolOptions = computed(() => [
  { value: 'reveal' as const, label: t('mines.play.reveal') },
  { value: 'flag' as const, label: t('mines.play.flag') },
])
const hint = shallowRef<Hint | null>(null)
const showHit = ref(false)

function freshAttempt(next: MinesPuzzle): MinesSave {
  return { puzzle: next, cells: initialCells(next), actions: 0, elapsedMs: 0, hintsUsed: 0, mistakes: 0 }
}

const session = usePuzzleSession({
  gameId: 'mines',
  slot: saveSlot,
  variants: DIFFICULTIES,
  variantOf: (save) => save.puzzle.difficulty,
  create: async (difficulty) => freshAttempt(await minesPool.take(difficulty)),
  onShow: (save, reason) => {
    hint.value = null
    showHit.value = false
    tool.value = 'reveal'
    // A saved attempt that ended on a mine comes back with the "mine hit" dialog.
    if (reason === 'resume' && save.hit !== undefined) {
      status.value = 'lost'
      stopwatch.pause()
      showHit.value = true
    }
  },
  // The attempt stays saved after a hit (it can still be undone).
  savedWhile: ['playing', 'lost'],
})
const { status, game, stopwatch, result, showResult, showRules, later, markStarted, persist } = session

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

// --- Playing -----------------------------------------------------------------------

/** Counts the move; the first move of an attempt starts the statistics entry. */
function countAction(g: MinesSave): void {
  markStarted()
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

/** Starts the same board again (after a mine hit or via Restart). */
function restartAttempt(): void {
  if (game.value) session.restart(freshAttempt(game.value.puzzle))
}

function confirmedRestart(): void {
  confirmRestart.value = false
  restartAttempt()
}

// --- Win -------------------------------------------------------------------------------

function win(): void {
  const g = game.value
  if (!g) return
  hint.value = null
  g.cells = flagAllMines(g.puzzle, g.cells)
  // Shows the finished board before the dialog covers it.
  session.win()
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
  showHit.value = false
  session.playAgain()
}

function goHome(): void {
  showHit.value = false
  session.goHome()
}

session.init()
</script>

<template>
  <PlayBar
    v-model:rules-open="showRules"
    :title="t('mines.name')"
    back-to="/mines"
    :elapsed-ms="status === 'loading' ? null : stopwatch.elapsedMs.value"
    :rules-label="t('mines.play.rules')"
    :rules-title="t('mines.rules.title')"
  >
    <MinesRules />
  </PlayBar>

  <main class="puzzle-play">
    <GameBackdrop game="mines" />
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

      <div
        class="board-wrap"
        :style="{ '--ratio': game.puzzle.width / game.puzzle.height, '--cols': game.puzzle.width }"
      >
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
          :label="t('common.close')"
          @click="hint = null"
        />
        <AppButton variant="primary" @click="applyCurrentHint">
          {{ hint.kind === 'wrong' ? t('mines.hint.removeWrong') : t('common.apply') }}
        </AppButton>
      </div>
      <div v-else class="toolbar">
        <SegmentedControl v-model="tool" :options="toolOptions" :label="t('mines.play.tool')">
          <template #icon="{ value }">
            <span v-if="value === 'reveal'" class="tool__swatch" aria-hidden="true" />
            <svg v-else class="tool__flag" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 3.5v17M4.5 20.5h7" />
              <path class="tool__cloth" d="M8 4.2l10 4.3-10 4.3z" />
            </svg>
          </template>
        </SegmentedControl>
        <AppButton
          v-if="!minesSettings.instantMistakes"
          class="toolbar__icon"
          icon="inspect"
          :disabled="status !== 'playing'"
          :label="t('common.check')"
          @click="check"
        />
        <AppButton
          class="toolbar__icon"
          icon="hint"
          :disabled="status !== 'playing'"
          :label="t('common.hint')"
          @click="requestHint"
        />
        <AppButton
          class="toolbar__icon"
          icon="restart"
          :disabled="status !== 'playing'"
          :label="t('mines.play.restart')"
          @click="confirmRestart = true"
        />
      </div>
    </template>
  </main>

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
    :share="result && game ? { game: 'mines', variant: game.puzzle.difficulty, result: formatDuration(result.timeMs), kind: 'time', newBest: result.newBest } : undefined"
    :subtitle="t('mines.result.solvedText')"
    :rows="resultRows"
    :badge="result?.newBest ? t('common.newBest') : undefined"
  >
    <template #actions>
      <AppButton variant="primary" block @click="newPuzzle">{{ t('common.newGame') }}</AppButton>
      <AppButton block @click="session.goToMenu">{{ t('mines.play.toMenu') }}</AppButton>
      <AppButton variant="ghost" icon="home" block @click="goHome">{{ t('common.home') }}</AppButton>
    </template>
  </ResultDialog>
</template>

<style scoped>
.puzzle-play {
  gap: var(--space-2);
  min-height: 0;
  padding: var(--space-1) max(var(--space-3), env(safe-area-inset-right))
    max(var(--space-3), env(safe-area-inset-bottom)) max(var(--space-3), env(safe-area-inset-left));
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
  /* Cells stay at least 26 px wide (WCAG 2.5.8); on short screens the page scrolls instead. */
  min-width: min(100%, calc(var(--cols) * 28px + 8px));
}

.toolbar {
  flex: none;
}

.toolbar > * {
  max-width: 260px;
  white-space: normal;
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
