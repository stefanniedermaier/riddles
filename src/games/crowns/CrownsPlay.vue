<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'

import AppButton from '@/components/AppButton.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import HintPanel from '@/components/HintPanel.vue'
import GameBackdrop from '@/components/GameBackdrop.vue'
import LoadingOverlay from '@/components/LoadingOverlay.vue'
import PlayBar from '@/components/PlayBar.vue'
import ResultDialog from '@/components/ResultDialog.vue'
import { checkMessage } from '@/core/check'
import { formatDuration } from '@/core/format'
import { diffCells, pushStep, revertStep } from '@/core/history'
import { t } from '@/core/i18n'
import { showToast } from '@/core/toast'
import { usePuzzleSession } from '@/core/usePuzzleSession'
import CrownsBoard from './CrownsBoard.vue'
import type { BoardHighlight } from './boardTypes'
import CrownsRules from './CrownsRules.vue'
import { hintText, hintTitle } from './hintText'
import { DIFFICULTIES, saveSlot } from './index'
import { createGeometry } from './logic/geometry'
import {
  applyHint,
  getHint,
  isWrongCell,
  solutionCells,
  wrongCells,
  type Hint,
} from './logic/hints'
import { blockedCells, countCrowns, findConflicts, isSolved } from './logic/rules'
import { CROWN, EMPTY, MARK, type CellState, type CrownsSave } from './logic/types'
import { crownsPool } from './pool'
import { crownsSettings } from './settings'

const session = usePuzzleSession({
  gameId: 'crowns',
  slot: saveSlot,
  variants: DIFFICULTIES,
  variantOf: (save) => save.puzzle.difficulty,
  create: async (difficulty): Promise<CrownsSave> => {
    const next = await crownsPool.take(difficulty)
    return {
      puzzle: next,
      cells: new Array<CellState>(next.size * next.size).fill(EMPTY),
      elapsedMs: 0,
      hintsUsed: 0,
      undo: [],
    }
  },
  onShow: () => (hint.value = null),
  onUndo: () => undo(),
})
const { status, game, stopwatch, result, showResult, showRules, saveProgress } = session

const puzzle = computed(() => game.value?.puzzle ?? null)
const geo = computed(() => (puzzle.value ? createGeometry(puzzle.value.size, puzzle.value.regions) : null))

const conflicts = computed(() =>
  game.value && geo.value && crownsSettings.value.instantConflicts
    ? findConflicts(geo.value, game.value.cells)
    : null,
)
/** Cells found by the last "Check" that are still wrong. */
const wrong = computed(() => {
  const g = game.value
  if (!g?.checked?.length) return null
  const solution = solutionCells(g.puzzle)
  return new Set(g.checked.filter((cell) => isWrongCell(solution, g.cells, cell)))
})
const blocked = computed(() =>
  game.value && geo.value && crownsSettings.value.autoMark
    ? blockedCells(geo.value, game.value.cells)
    : null,
)
const crownsPlaced = computed(() => (game.value ? countCrowns(game.value.cells) : 0))

const title = computed(() =>
  puzzle.value
    ? `${t('crowns.name')} · ${t(`difficulty.${puzzle.value.difficulty}`)}`
    : t('crowns.name'),
)

// --- Moves & undo ---------------------------------------------------------------------

/** Records the change from `before` to the current board as one undo step. */
function commit(before: readonly CellState[]): void {
  if (!game.value) return
  game.value.undo = pushStep(game.value.undo ?? [], diffCells(before, game.value.cells))
}

function afterMove(): void {
  hint.value = null
  saveProgress()
  checkWin()
}

function onTap(cell: number): void {
  if (!game.value || status.value !== 'playing') return
  const before = game.value.cells.slice()
  const current = game.value.cells[cell]
  game.value.cells[cell] = current === EMPTY ? MARK : current === MARK ? CROWN : EMPTY
  commit(before)
  afterMove()
}

/** Board before the current drag stroke (a whole stroke is one undo step). */
let strokeBefore: CellState[] | null = null

function onPaint(cell: number, value: CellState): void {
  if (!game.value || status.value !== 'playing') return
  strokeBefore ??= game.value.cells.slice()
  game.value.cells[cell] = value
  hint.value = null
}

function onStrokeEnd(): void {
  if (strokeBefore) commit(strokeBefore)
  strokeBefore = null
  afterMove()
}

const canUndo = computed(() => status.value === 'playing' && (game.value?.undo?.length ?? 0) > 0)

function undo(): void {
  if (!game.value || !canUndo.value) return
  const history = game.value.undo ?? []
  const step = history[history.length - 1]!
  game.value.cells = revertStep(game.value.cells, step)
  game.value.undo = history.slice(0, -1)
  hint.value = null
  saveProgress()
}

const confirmClear = ref(false)

function clearBoard(): void {
  confirmClear.value = false
  if (!game.value) return
  const before = game.value.cells.slice()
  game.value.cells = game.value.cells.map(() => EMPTY)
  commit(before)
  afterMove()
}

// --- Win ------------------------------------------------------------------------------

function checkWin(): void {
  if (!game.value || !geo.value || !isSolved(geo.value, game.value.cells)) return
  // The stars celebrate before the dialog covers the board.
  session.win()
}

const resultRows = computed(() => {
  if (!game.value || !result.value) return []
  const p = game.value.puzzle
  return [
    { label: t('common.difficulty'), value: t(`difficulty.${p.difficulty}`) },
    { label: t('common.size'), value: t('crowns.sizeLabel', { size: p.size }) },
    { label: t('common.time'), value: formatDuration(result.value.timeMs), highlight: result.value.newBest },
    { label: t('common.mistakes'), value: String(game.value.mistakes ?? 0) },
    { label: t('common.hints'), value: String(game.value.hintsUsed) },
  ]
})

// --- Check ------------------------------------------------------------------------------

/**
 * Highlights wrong crowns and marks and counts the ones an earlier check has not counted
 * yet (checking twice without changes does not count a mistake twice).
 */
function check(): void {
  const g = game.value
  if (!g || status.value !== 'playing') return
  hint.value = null
  const found = wrongCells(g.puzzle, g.cells)
  const counted = new Set(wrong.value ?? [])
  g.mistakes = (g.mistakes ?? 0) + found.filter((cell) => !counted.has(cell)).length
  g.checked = found
  saveProgress()
  showToast(checkMessage(found.length))
}

// --- Hints ------------------------------------------------------------------------------

const hint = shallowRef<Hint | null>(null)

function requestHint(): void {
  if (!game.value || status.value !== 'playing') return
  const next = getHint(game.value.puzzle, game.value.cells)
  hint.value = next
  if (next.kind === 'step' || next.kind === 'wrongCrown' || next.kind === 'wrongMark') {
    game.value.hintsUsed += 1
    saveProgress()
  }
}

function applyCurrentHint(): void {
  if (!game.value || !hint.value) return
  const before = game.value.cells.slice()
  game.value.cells = applyHint(game.value.cells, hint.value)
  commit(before)
  afterMove()
}

const canApply = computed(
  () => hint.value !== null && ['step', 'wrongCrown', 'wrongMark'].includes(hint.value.kind),
)

const highlight = computed<BoardHighlight | null>(() => {
  const h = hint.value
  if (!h || !geo.value) return null
  if (h.kind === 'wrongCrown' || h.kind === 'wrongMark') {
    return { tint: new Set(), focus: new Set([h.cell]), ghost: new Map() }
  }
  if (h.kind !== 'step') return null
  const { step } = h
  const size = geo.value.size
  const tint = new Set<number>()
  for (const unit of step.units) {
    const offset = unit.kind === 'row' ? 0 : unit.kind === 'col' ? size : 2 * size
    for (const cell of geo.value.unitCells[offset + unit.index]!) tint.add(cell)
  }
  const focus =
    step.technique === 'lastCell' || step.technique === 'forced' ? new Set(step.focusCells) : new Set<number>()
  const ghost = new Map<number, 'mark' | 'crown'>()
  for (const cell of step.eliminations) ghost.set(cell, 'mark')
  for (const cell of step.placements) ghost.set(cell, 'crown')
  return { tint, focus, ghost }
})

session.init()
</script>

<template>
  <PlayBar
    v-model:rules-open="showRules"
    :title="title"
    back-to="/crowns"
    :elapsed-ms="status === 'loading' ? null : stopwatch.elapsedMs.value"
    :rules-label="t('crowns.play.rules')"
    :rules-title="t('crowns.rules.title')"
  >
    <CrownsRules />
  </PlayBar>

  <main class="puzzle-play">
    <GameBackdrop game="crowns" />
    <LoadingOverlay v-if="status === 'loading' || !game" :label="t('common.generating')" />

    <template v-else>
      <p class="progress tabular">
        {{ t('crowns.play.crownsPlaced', { placed: crownsPlaced, total: game.puzzle.size }) }}
      </p>

      <div class="board-wrap">
        <CrownsBoard
          :size="game.puzzle.size"
          :regions="game.puzzle.regions"
          :cells="game.cells"
          :conflicts="conflicts"
          :wrong="wrong"
          :blocked="blocked"
          :highlight="highlight"
          :disabled="status !== 'playing'"
          :solved="status === 'won'"
          @tap="onTap"
          @paint="onPaint"
          @stroke-end="onStrokeEnd"
        />
      </div>

      <HintPanel
        v-if="hint"
        :title="hintTitle(hint)"
        :action-label="canApply ? (hint.kind === 'step' ? t('common.apply') : t('crowns.hint.fix')) : undefined"
        @apply="applyCurrentHint"
        @close="hint = null"
      >
        <p>{{ hintText(hint) }}</p>
      </HintPanel>

      <div v-else class="toolbar">
        <AppButton
          class="toolbar__undo"
          icon="undo"
          :disabled="!canUndo"
          :label="t('crowns.play.undo')"
          @click="undo"
        />
        <AppButton
          class="toolbar__undo"
          icon="inspect"
          :disabled="status !== 'playing'"
          :label="t('common.check')"
          @click="check"
        />
        <AppButton icon="hint" :disabled="status !== 'playing'" @click="requestHint">
          {{ t('common.hint') }}
        </AppButton>
        <AppButton icon="eraser" :disabled="status !== 'playing'" @click="confirmClear = true">
          {{ t('crowns.play.clear') }}
        </AppButton>
      </div>
    </template>
  </main>

  <ConfirmDialog
    :open="confirmClear"
    :message="t('crowns.play.clearConfirm')"
    :confirm-label="t('crowns.play.clear')"
    danger
    @confirm="clearBoard"
    @cancel="confirmClear = false"
  />

  <ResultDialog
    :open="showResult"
    :title="t('common.solved')"
    :share="result && game ? { game: 'crowns', variant: game.puzzle.difficulty, result: formatDuration(result.timeMs), kind: 'time', newBest: result.newBest } : undefined"
    :subtitle="t('crowns.play.solvedText')"
    :rows="resultRows"
    :badge="result?.newBest ? t('common.newBest') : undefined"
  >
    <template #actions>
      <AppButton variant="primary" block @click="session.playAgain">{{ t('common.newGame') }}</AppButton>
      <AppButton block @click="session.goToMenu">{{ t('crowns.play.toMenu') }}</AppButton>
      <AppButton variant="ghost" icon="home" block @click="session.goHome">{{ t('common.home') }}</AppButton>
    </template>
  </ResultDialog>
</template>

<style scoped>
.progress {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-muted);
}

.board-wrap {
  /* Fit the board into the viewport: width-bound on phones, height-bound on short screens. */
  width: min(100%, 520px, calc(100dvh - 300px - env(safe-area-inset-top) - env(safe-area-inset-bottom)));
  min-width: min(100%, 260px);
}

.toolbar > * {
  white-space: normal;
}

.toolbar > .toolbar__undo {
  flex: none;
  width: var(--tap-min);
  padding: 0;
}

</style>
