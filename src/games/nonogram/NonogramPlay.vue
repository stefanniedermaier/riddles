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
import { formatDuration } from '@/core/format'
import { t } from '@/core/i18n'
import { returnTo } from '@/core/navigation'
import { recordFinish, recordStart } from '@/core/stats'
import { load, remove, save } from '@/core/storage'
import { motionEnabled } from '@/core/theme'
import { useStopwatch } from '@/core/timer'
import { checkMessage } from '@/core/check'
import { showToast } from '@/core/toast'
import { DIFFICULTIES, SAVE_KEY, type Difficulty } from './index'
import { applyHint, getHint, type Hint } from './logic/hints'
import { diffCells, pushStep, revertStep } from './logic/history'
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
import { UNKNOWN, isNonogramSave, type CellMark, type NonogramSave, type Tool } from './logic/types'
import NonogramBoard from './NonogramBoard.vue'
import NonogramRules from './NonogramRules.vue'
import { nonogramPool } from './pool'
import { nonogramSettings } from './settings'

const route = useRoute()
const router = useRouter()

type Status = 'loading' | 'playing' | 'won'

const status = ref<Status>('loading')
const game = ref<NonogramSave | null>(null)
const stopwatch = useStopwatch(0)
const tool = ref<Tool>('fill')
const stroke = shallowRef<Stroke | null>(null)
const focusCell = ref<number | null>(null)

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

// --- Persistence ------------------------------------------------------------------

function persist(): void {
  if (!game.value || status.value !== 'playing') return
  save(SAVE_KEY, { ...toRaw(game.value), elapsedMs: Math.round(stopwatch.elapsedMs.value) })
}

function onVisibilityChange(): void {
  if (document.hidden) persist()
}

function onKeydown(event: KeyboardEvent): void {
  if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === 'z') {
    event.preventDefault()
    undo()
  } else if (!event.ctrlKey && !event.metaKey && !event.altKey) {
    const key = event.key.toLowerCase()
    if (key === 'f') tool.value = 'fill'
    else if (key === 'x') tool.value = 'cross'
  }
}

let autosave: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('pagehide', persist)
  window.addEventListener('keydown', onKeydown)
  autosave = setInterval(persist, 5000)
})

onBeforeUnmount(() => {
  // Invalidate a generation that is still running.
  startToken++
  persist()
  clearInterval(autosave)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  window.removeEventListener('pagehide', persist)
  window.removeEventListener('keydown', onKeydown)
})

// --- Starting / resuming ------------------------------------------------------------

let startToken = 0

async function startNew(difficulty: Difficulty): Promise<void> {
  const token = ++startToken
  status.value = 'loading'
  result.value = null
  hint.value = null
  stroke.value = null
  focusCell.value = null
  stopwatch.reset(0)
  // Drop ?new= right away (before awaiting the puzzle), so a reload resumes and no late
  // navigation can cancel a "back" tapped meanwhile.
  void router.replace({ name: 'nonogram-play' })
  const next = await nonogramPool.take(difficulty)
  if (token !== startToken) return
  game.value = {
    puzzle: next,
    cells: new Array<CellMark>(next.width * next.height).fill(UNKNOWN),
    elapsedMs: 0,
    hintsUsed: 0,
    mistakes: 0,
    undo: [],
  }
  recordStart('nonogram', difficulty)
  status.value = 'playing'
  persist()
  stopwatch.start()
}

function resume(): boolean {
  const saved = load(SAVE_KEY, null, (raw) => (isNonogramSave(raw) ? raw : undefined))
  if (!saved) return false
  game.value = saved
  stopwatch.reset(saved.elapsedMs)
  status.value = 'playing'
  stopwatch.start()
  return true
}

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
  persist()
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
  persist()
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
  persist()
  showToast(checkMessage(found.length))
}

// --- Hints -----------------------------------------------------------------------------

const hint = shallowRef<Hint | null>(null)

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
  persist()
}

function applyCurrentHint(): void {
  const h = hint.value
  if (!game.value || !h) return
  commit(applyHint(game.value.cells, h), false)
  hint.value = null
}

// --- Win -------------------------------------------------------------------------------

const result = ref<{ timeMs: number; newBest: boolean } | null>(null)
const showResult = ref(false)

function checkWin(): void {
  if (!game.value || !isSolved(game.value.puzzle, game.value.cells)) return
  stopwatch.pause()
  status.value = 'won'
  hint.value = null
  focusCell.value = null
  const timeMs = Math.round(stopwatch.elapsedMs.value)
  const { newBestTime } = recordFinish('nonogram', game.value.puzzle.difficulty, { timeMs })
  remove(SAVE_KEY)
  result.value = { timeMs, newBest: newBestTime }
  // Show the finished picture before the dialog covers it.
  setTimeout(() => (showResult.value = true), motionEnabled.value ? 900 : 0)
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

function playAgain(): void {
  showResult.value = false
  void startNew(game.value?.puzzle.difficulty ?? 'easy')
}

function goToMenu(): void {
  showResult.value = false
  void returnTo(router, { name: 'nonogram' })
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
  void router.replace({ name: 'nonogram' })
}
</script>

<template>
  <AppBar :title="title" back-to="/nonogram">
    <template #actions>
      <span v-if="status !== 'loading'" class="timer tabular" :aria-label="t('common.time')">
        <AppIcon name="clock" :size="18" />
        {{ formatDuration(stopwatch.elapsedMs.value) }}
      </span>
      <button type="button" class="icon-btn" :aria-label="t('nonogram.play.rules')" @click="showRules = true">
        <AppIcon name="info" />
      </button>
    </template>
  </AppBar>

  <main class="play">
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
          :aria-label="t('common.close')"
          :title="t('common.close')"
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
          :aria-label="t('nonogram.play.undo')"
          :title="t('nonogram.play.undo')"
          @click="undo"
        />
        <div class="tools" role="radiogroup" :aria-label="t('nonogram.play.tool')">
          <button
            type="button"
            role="radio"
            class="tool"
            :class="{ 'tool--active': tool === 'fill' }"
            :aria-checked="tool === 'fill'"
            @click="tool = 'fill'"
          >
            <span class="tool__swatch tool__swatch--fill" aria-hidden="true" />
            {{ t('nonogram.play.fill') }}
          </button>
          <button
            type="button"
            role="radio"
            class="tool"
            :class="{ 'tool--active': tool === 'cross' }"
            :aria-checked="tool === 'cross'"
            @click="tool = 'cross'"
          >
            <AppIcon name="close" :size="16" />
            {{ t('nonogram.play.cross') }}
          </button>
        </div>
        <AppButton
          v-if="!nonogramSettings.instantMistakes"
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
          :aria-label="t('nonogram.play.restart')"
          :title="t('nonogram.play.restart')"
          @click="confirmRestart = true"
        />
      </div>
    </template>
  </main>

  <AppDialog :open="showRules" :title="t('nonogram.rules.title')" @close="showRules = false">
    <NonogramRules />
  </AppDialog>

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
    :subtitle="t('nonogram.result.solvedText')"
    :rows="resultRows"
    :badge="result?.newBest ? t('common.newBest') : undefined"
  >
    <template #actions>
      <AppButton variant="primary" block @click="playAgain">{{ t('common.newGame') }}</AppButton>
      <AppButton block @click="goToMenu">{{ t('nonogram.play.toMenu') }}</AppButton>
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
  display: flex;
  justify-content: center;
  align-items: baseline;
  gap: var(--space-4);
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
  border-radius: 3px;
}

.tool__swatch--fill {
  background: var(--game-nonogram);
}
</style>
