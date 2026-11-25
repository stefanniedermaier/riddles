<script setup lang="ts">
import { computed, ref } from 'vue'

import AppButton from '@/components/AppButton.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import GameBackdrop from '@/components/GameBackdrop.vue'
import LoadingOverlay from '@/components/LoadingOverlay.vue'
import PlayBar from '@/components/PlayBar.vue'
import ResultDialog from '@/components/ResultDialog.vue'
import { formatDuration } from '@/core/format'
import { t } from '@/core/i18n'
import { randomSeed } from '@/core/rng'
import { showToast } from '@/core/toast'
import { usePuzzleSession } from '@/core/usePuzzleSession'
import { DIFFICULTIES, saveSlot, sizeLabel } from './index'
import { generatePuzzle } from './logic/generator'
import { colors, getHint, isSolved } from './logic/rules'
import { sourcesOf, type PipesPuzzle, type PipesSave } from './logic/types'
import PipesBoard from './PipesBoard.vue'
import PipesRules from './PipesRules.vue'

const highlight = ref<number | null>(null)

function fresh(puzzle: PipesPuzzle): PipesSave {
  return { puzzle, turns: [...puzzle.scramble], locked: [], moves: 0, elapsedMs: 0, hintsUsed: 0, undo: [] }
}

const session = usePuzzleSession({
  gameId: 'pipes',
  slot: saveSlot,
  variants: DIFFICULTIES,
  variantOf: (save) => save.puzzle.difficulty,
  create: (difficulty) => fresh(generatePuzzle(difficulty, randomSeed())),
  onShow: () => (highlight.value = null),
  onUndo: () => undo(),
})
const { status, game, stopwatch, result, showResult, showRules, markStarted, persist, saveProgress } = session

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

// --- Playing -----------------------------------------------------------------------

function onRotate(cell: number): void {
  const g = game.value
  if (!g || status.value !== 'playing') return
  if (lockedSet.value.has(cell)) {
    showToast(t('pipes.play.locked'))
    return
  }
  markStarted()
  highlight.value = null
  g.turns = g.turns.map((turn, c) => (c === cell ? (turn + 1) % 4 : turn))
  g.undo = [...g.undo, cell]
  g.moves += 1
  afterChange(g)
}

function onLock(cell: number): void {
  const g = game.value
  if (!g || status.value !== 'playing') return
  g.locked = lockedSet.value.has(cell) ? g.locked.filter((c) => c !== cell) : [...g.locked, cell]
  saveProgress()
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
  if (isSolved(g.puzzle, g.turns)) {
    highlight.value = null
    session.win()
  } else {
    persist()
  }
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
  markStarted()
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
  if (game.value) session.restart(fresh(game.value.puzzle))
}

// --- Result ----------------------------------------------------------------------------

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

session.init()
</script>

<template>
  <PlayBar
    v-model:rules-open="showRules"
    :title="t('pipes.name')"
    back-to="/pipes"
    :elapsed-ms="status === 'loading' ? null : stopwatch.elapsedMs.value"
    :rules-label="t('pipes.play.rules')"
    :rules-title="t('pipes.rules.title')"
  >
    <PipesRules />
  </PlayBar>

  <main class="puzzle-play">
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
          :label="t('pipes.play.restart')"
          @click="confirmRestart = true"
        />
      </div>
    </template>
  </main>

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
      <AppButton variant="primary" block @click="session.playAgain">{{ t('common.newGame') }}</AppButton>
      <AppButton block @click="session.goToMenu">{{ t('pipes.play.toMenu') }}</AppButton>
      <AppButton variant="ghost" icon="home" block @click="session.goHome">{{ t('common.home') }}</AppButton>
    </template>
  </ResultDialog>
</template>

<style scoped>
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
</style>
