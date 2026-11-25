<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'

import AppButton from '@/components/AppButton.vue'
import AppIcon from '@/components/AppIcon.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import GameBackdrop from '@/components/GameBackdrop.vue'
import LoadingOverlay from '@/components/LoadingOverlay.vue'
import PlayBar from '@/components/PlayBar.vue'
import ResultDialog from '@/components/ResultDialog.vue'
import SegmentedControl from '@/components/SegmentedControl.vue'
import { checkMessage } from '@/core/check'
import { formatDuration } from '@/core/format'
import { diffCells, pushStep, revertStep } from '@/core/history'
import { t } from '@/core/i18n'
import { showToast } from '@/core/toast'
import { usePuzzleSession } from '@/core/usePuzzleSession'
import { DIFFICULTIES, saveSlot } from './index'
import { applyHint, getHint, type Hint } from './logic/hints'
import type { LineRef } from './logic/lines'
import {
  applyStroke,
  beginStroke,
  isSolved,
  isWrong,
  lineSatisfied,
  moveStroke,
  newMistakes,
  progressPercent,
  wrongCells,
  type Stroke,
} from './logic/rules'
import { UNKNOWN, type CellMark, type NonogramSave, type Tool } from './logic/types'
import NonogramBoard from './NonogramBoard.vue'
import NonogramRules from './NonogramRules.vue'
import { nonogramPool } from './pool'
import { nonogramSettings } from './settings'

const tool = ref<Tool>('fill')
const toolOptions = computed(() => [
  { value: 'fill' as const, label: t('nonogram.play.fill') },
  { value: 'cross' as const, label: t('nonogram.play.cross') },
])
const stroke = shallowRef<Stroke | null>(null)
const focusCell = ref<number | null>(null)
const hint = shallowRef<Hint | null>(null)

const session = usePuzzleSession({
  gameId: 'nonogram',
  slot: saveSlot,
  variants: DIFFICULTIES,
  variantOf: (save) => save.puzzle.difficulty,
  create: async (difficulty): Promise<NonogramSave> => {
    const next = await nonogramPool.take(difficulty)
    return {
      puzzle: next,
      cells: new Array<CellMark>(next.width * next.height).fill(UNKNOWN),
      elapsedMs: 0,
      hintsUsed: 0,
      mistakes: 0,
      undo: [],
    }
  },
  onShow: () => {
    hint.value = null
    stroke.value = null
    focusCell.value = null
  },
  onUndo: () => undo(),
})
const { status, game, stopwatch, result, showResult, showRules, saveProgress } = session

const puzzle = computed(() => game.value?.puzzle ?? null)

/** Marks shown on the board (live while a stroke is in progress). */
const shownCells = computed<CellMark[]>(() => {
  if (!game.value) return []
  if (stroke.value) return applyStroke(game.value.cells, stroke.value, game.value.puzzle.width)
  return game.value.cells
})

/**
 * Cells shown as mistakes: every wrong mark in instant mode, otherwise the marks found by
 * the last "Check" that are still wrong.
 */
const wrong = computed(() => {
  const p = puzzle.value
  if (!p || !game.value) return null
  if (nonogramSettings.value.instantMistakes) return new Set(wrongCells(p, shownCells.value))
  const checked = game.value.checked ?? []
  return checked.length ? new Set(checked.filter((cell) => isWrong(p, shownCells.value, cell))) : null
})
const rowsDone = computed(() =>
  puzzle.value
    ? puzzle.value.rowClues.map((_, index) => lineSatisfied(puzzle.value!, shownCells.value, { kind: 'row', index }))
    : [],
)
const colsDone = computed(() =>
  puzzle.value
    ? puzzle.value.colClues.map((_, index) => lineSatisfied(puzzle.value!, shownCells.value, { kind: 'col', index }))
    : [],
)
const progress = computed(() => (puzzle.value ? progressPercent(puzzle.value, shownCells.value) : 0))

// The difficulty is shown in the HUD; "Nonogram · Experte" would not fit next to the timer.
const title = computed(() => t('nonogram.name'))
const levelLabel = computed(() =>
  puzzle.value
    ? `${t(`difficulty.${puzzle.value.difficulty}`)} · ${t('nonogram.sizeLabel', { width: puzzle.value.width, height: puzzle.value.height })}`
    : '',
)

// --- Tool keys -------------------------------------------------------------------------

/** F / X pick the tool (Ctrl/⌘+Z is handled by the session). */
function onKeydown(event: KeyboardEvent): void {
  if (event.ctrlKey || event.metaKey || event.altKey) return
  const key = event.key.toLowerCase()
  if (key === 'f') tool.value = 'fill'
  else if (key === 'x') tool.value = 'cross'
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

// --- Marking -----------------------------------------------------------------------------

/** Stores `next` as the new board, as one undo step, counting new mistakes. */
function commit(next: CellMark[], countMistakes = true): void {
  if (!game.value) return
  const before = game.value.cells
  const step = diffCells(before, next)
  if (step.length === 0) return
  if (countMistakes && nonogramSettings.value.instantMistakes) {
    game.value.mistakes += newMistakes(game.value.puzzle, before, next)
  }
  game.value.undo = pushStep(game.value.undo, step)
  game.value.cells = next
  hint.value = null
  saveProgress()
  checkWin()
}

function onStart(cell: number): void {
  if (!game.value || status.value !== 'playing') return
  hint.value = null
  focusCell.value = cell
  stroke.value = beginStroke(game.value.cells, cell, tool.value)
}

function onMove(cell: number): void {
  if (!game.value || !stroke.value) return
  focusCell.value = cell
  stroke.value = moveStroke(stroke.value, cell, game.value.puzzle.width)
}

function onEnd(): void {
  const current = stroke.value
  stroke.value = null
  if (!game.value || !current) return
  commit(applyStroke(game.value.cells, current, game.value.puzzle.width))
}

const canUndo = computed(() => status.value === 'playing' && (game.value?.undo.length ?? 0) > 0)

function undo(): void {
  if (!game.value || !canUndo.value) return
  const step = game.value.undo[game.value.undo.length - 1]!
  game.value.cells = revertStep(game.value.cells, step)
  game.value.undo = game.value.undo.slice(0, -1)
  hint.value = null
  saveProgress()
}

const confirmRestart = ref(false)

function restart(): void {
  confirmRestart.value = false
  if (!game.value) return
  commit(game.value.cells.map(() => UNKNOWN), false)
}

// --- Check -----------------------------------------------------------------------------

/**
 * Highlights the wrong marks and counts the ones an earlier check has not counted yet
 * (checking twice without changes does not count a mistake twice).
 */
function check(): void {
  const g = game.value
  if (!g || status.value !== 'playing') return
  hint.value = null
  const found = wrongCells(g.puzzle, g.cells)
  const counted = new Set((g.checked ?? []).filter((cell) => isWrong(g.puzzle, g.cells, cell)))
  g.mistakes += found.filter((cell) => !counted.has(cell)).length
  g.checked = found
  saveProgress()
  showToast(checkMessage(found.length))
}

// --- Hints -----------------------------------------------------------------------------

function lineName(line: LineRef): string {
  return line.kind === 'row'
    ? t('nonogram.unit.row', { n: line.index + 1 })
    : t('nonogram.unit.col', { n: line.index + 1 })
}

const hintTitle = computed(() => {
  const h = hint.value
  if (!h) return ''
  if (h.kind === 'wrong') return t('nonogram.hint.wrongTitle')
  if (h.kind === 'step') return t('nonogram.hint.stepTitle', { line: lineName(h.line) })
  return ''
})

const hintText = computed(() => {
  const h = hint.value
  if (!h || !puzzle.value) return ''
  if (h.kind === 'wrong') return t('nonogram.hint.wrong')
  if (h.kind !== 'step') return ''
  const clue = h.line.kind === 'row' ? puzzle.value.rowClues[h.line.index]! : puzzle.value.colClues[h.line.index]!
  const parts = [
    h.fills.length ? t('nonogram.hint.fills', { count: h.fills.length }) : '',
    h.crosses.length ? t('nonogram.hint.crosses', { count: h.crosses.length }) : '',
  ].filter(Boolean)
  const what = parts.length === 2 ? t('nonogram.hint.and', { a: parts[0]!, b: parts[1]! }) : parts[0]!
  return t('nonogram.hint.step', { clue: clue.length ? clue.join(' ') : t('nonogram.play.clueEmpty'), what })
})

const hintCells = computed(() => {
  const h = hint.value
  if (!h) return null
  if (h.kind === 'wrong') return new Set(h.cells)
  if (h.kind === 'step') return new Set([...h.fills, ...h.crosses])
  return null
})

const hintLine = computed(() => (hint.value?.kind === 'step' ? hint.value.line : null))

function requestHint(): void {
  if (!game.value || status.value !== 'playing') return
  const next = getHint(game.value.puzzle, game.value.cells)
  if (next.kind === 'none') {
    showToast(t('nonogram.play.noHint'))
    return
  }
  hint.value = next
  game.value.hintsUsed += 1
  saveProgress()
}

function applyCurrentHint(): void {
  const h = hint.value
  if (!game.value || !h) return
  commit(applyHint(game.value.cells, h), false)
  hint.value = null
}

// --- Win -------------------------------------------------------------------------------

function checkWin(): void {
  if (!game.value || !isSolved(game.value.puzzle, game.value.cells)) return
  hint.value = null
  focusCell.value = null
  // Show the finished picture before the dialog covers it.
  session.win()
}

const resultRows = computed(() => {
  if (!game.value || !result.value) return []
  const p = game.value.puzzle
  return [
    { label: t('common.difficulty'), value: t(`difficulty.${p.difficulty}`) },
    { label: t('common.size'), value: t('nonogram.sizeLabel', { width: p.width, height: p.height }) },
    { label: t('common.time'), value: formatDuration(result.value.timeMs), highlight: result.value.newBest },
    { label: t('nonogram.result.mistakes'), value: String(game.value.mistakes) },
    { label: t('common.hints'), value: String(game.value.hintsUsed) },
  ]
})

session.init()
</script>

<template>
  <PlayBar
    v-model:rules-open="showRules"
    :title="title"
    back-to="/nonogram"
    :elapsed-ms="status === 'loading' ? null : stopwatch.elapsedMs.value"
    :rules-label="t('nonogram.play.rules')"
    :rules-title="t('nonogram.rules.title')"
  >
    <NonogramRules />
  </PlayBar>

  <main class="puzzle-play">
    <GameBackdrop game="nonogram" />
    <LoadingOverlay v-if="status === 'loading' || !game" :label="t('common.generating')" />

    <template v-else>
      <div class="info" aria-live="polite">
        <template v-if="hint && hint.kind !== 'none'">
          <p class="info__hint">
            <strong>{{ hintTitle }}:</strong> {{ hintText }}
          </p>
        </template>
        <dl v-else class="hud tabular">
          <div>
            <dt class="visually-hidden">{{ t('common.difficulty') }}</dt>
            <dd class="hud__level">{{ levelLabel }}</dd>
          </div>
          <div>
            <dt>{{ t('nonogram.play.mistakes') }}</dt>
            <dd>{{ game.mistakes }}</dd>
          </div>
          <div>
            <dt>{{ t('nonogram.play.progress') }}</dt>
            <dd>{{ progress }} %</dd>
          </div>
        </dl>
      </div>

      <div class="board-area">
        <NonogramBoard
          :width="game.puzzle.width"
          :height="game.puzzle.height"
          :row-clues="game.puzzle.rowClues"
          :col-clues="game.puzzle.colClues"
          :cells="shownCells"
          :wrong="wrong"
          :rows-done="rowsDone"
          :cols-done="colsDone"
          :hint-line="hintLine"
          :hint-cells="hintCells"
          :focus-cell="nonogramSettings.highlightLines ? focusCell : null"
          :disabled="status !== 'playing'"
          :solved="status === 'won'"
          @start="onStart"
          @move="onMove"
          @end="onEnd"
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
          {{ hint.kind === 'wrong' ? t('nonogram.hint.fixWrong') : t('common.apply') }}
        </AppButton>
      </div>
      <div v-else class="toolbar">
        <AppButton
          class="toolbar__icon"
          icon="undo"
          :disabled="!canUndo"
          :label="t('nonogram.play.undo')"
          @click="undo"
        />
        <SegmentedControl v-model="tool" :options="toolOptions" :label="t('nonogram.play.tool')">
          <template #icon="{ value }">
            <span v-if="value === 'fill'" class="tool__swatch tool__swatch--fill" aria-hidden="true" />
            <AppIcon v-else name="close" :size="16" />
          </template>
        </SegmentedControl>
        <AppButton
          v-if="!nonogramSettings.instantMistakes"
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
          :label="t('nonogram.play.restart')"
          @click="confirmRestart = true"
        />
      </div>
    </template>
  </main>

  <ConfirmDialog
    :open="confirmRestart"
    :message="t('nonogram.play.restartConfirm')"
    :confirm-label="t('nonogram.play.restart')"
    danger
    @confirm="restart"
    @cancel="confirmRestart = false"
  />

  <ResultDialog
    :open="showResult"
    :title="t('common.solved')"
    :share="result && game ? { game: 'nonogram', variant: game.puzzle.difficulty, result: formatDuration(result.timeMs), kind: 'time', newBest: result.newBest } : undefined"
    :subtitle="t('nonogram.result.solvedText')"
    :rows="resultRows"
    :badge="result?.newBest ? t('common.newBest') : undefined"
  >
    <template #actions>
      <AppButton variant="primary" block @click="session.playAgain">{{ t('common.newGame') }}</AppButton>
      <AppButton block @click="session.goToMenu">{{ t('nonogram.play.toMenu') }}</AppButton>
      <AppButton variant="ghost" icon="home" block @click="session.goHome">{{ t('common.home') }}</AppButton>
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
  height: 40px;
  flex: none;
}

.info__hint {
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  font-size: var(--text-xs);
  line-height: 1.35;
  text-align: center;
}

.hud {
  align-items: baseline;
  margin: 0;
}

.hud div {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
}

.hud dt {
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.hud dd {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 800;
}

.hud .hud__level {
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--game-nonogram);
}

.board-area {
  flex: 1 1 0;
  width: 100%;
  min-height: 0;
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
  border-radius: 3px;
}

.tool__swatch--fill {
  background: var(--game-nonogram);
}
</style>
