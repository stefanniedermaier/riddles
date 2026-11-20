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
import { recordFinish, recordStart } from '@/core/stats'
import { load, remove, save } from '@/core/storage'
import { motionEnabled } from '@/core/theme'
import { useStopwatch } from '@/core/timer'
import CrownsBoard, { type BoardHighlight } from './CrownsBoard.vue'
import CrownsRules from './CrownsRules.vue'
import { hintText, hintTitle } from './hintText'
import { DIFFICULTIES, SAVE_KEY, type Difficulty } from './index'
import { createGeometry } from './logic/geometry'
import { applyHint, getHint, type Hint } from './logic/hints'
import { blockedCells, countCrowns, findConflicts, isSolved } from './logic/rules'
import { CROWN, EMPTY, MARK, isCrownsSave, type CellState, type CrownsSave } from './logic/types'
import { crownsPool } from './pool'
import { crownsSettings } from './settings'

const route = useRoute()
const router = useRouter()

type Status = 'loading' | 'playing' | 'won'

const status = ref<Status>('loading')
const game = ref<CrownsSave | null>(null)
const stopwatch = useStopwatch(0)

const puzzle = computed(() => game.value?.puzzle ?? null)
const geo = computed(() => (puzzle.value ? createGeometry(puzzle.value.size, puzzle.value.regions) : null))

const conflicts = computed(() =>
  game.value && geo.value && crownsSettings.value.showConflicts
    ? findConflicts(geo.value, game.value.cells)
    : null,
)
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

// --- Persistence ------------------------------------------------------------------

function persist(): void {
  if (!game.value || status.value !== 'playing') return
  save(SAVE_KEY, { ...toRaw(game.value), elapsedMs: Math.round(stopwatch.elapsedMs.value) })
}

function onVisibilityChange(): void {
  if (document.hidden) persist()
}

let autosave: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('pagehide', persist)
  autosave = setInterval(persist, 5000)
})

onBeforeUnmount(() => {
  persist()
  clearInterval(autosave)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  window.removeEventListener('pagehide', persist)
})

// --- Starting / resuming ------------------------------------------------------------

let startToken = 0

async function startNew(difficulty: Difficulty): Promise<void> {
  const token = ++startToken
  status.value = 'loading'
  hint.value = null
  result.value = null
  stopwatch.reset(0)
  const next = await crownsPool.take(difficulty)
  if (token !== startToken) return
  game.value = {
    puzzle: next,
    cells: new Array<CellState>(next.size * next.size).fill(EMPTY),
    elapsedMs: 0,
    hintsUsed: 0,
  }
  recordStart('crowns', difficulty)
  status.value = 'playing'
  persist()
  stopwatch.start()
  // Drop the ?new= query so a reload resumes this game instead of starting another one.
  void router.replace({ name: 'crowns-play' })
}

function resume(): boolean {
  const saved = load(SAVE_KEY, null, (raw) => (isCrownsSave(raw) ? raw : undefined))
  if (!saved) return false
  game.value = saved
  stopwatch.reset(saved.elapsedMs)
  status.value = 'playing'
  stopwatch.start()
  return true
}

// --- Moves ---------------------------------------------------------------------------

function afterMove(): void {
  hint.value = null
  persist()
  checkWin()
}

function onTap(cell: number): void {
  if (!game.value || status.value !== 'playing') return
  const current = game.value.cells[cell]
  game.value.cells[cell] = current === EMPTY ? MARK : current === MARK ? CROWN : EMPTY
  afterMove()
}

function onPaint(cell: number, value: CellState): void {
  if (!game.value || status.value !== 'playing') return
  game.value.cells[cell] = value
  hint.value = null
}

const confirmClear = ref(false)

function clearBoard(): void {
  confirmClear.value = false
  if (!game.value) return
  game.value.cells = game.value.cells.map(() => EMPTY)
  afterMove()
}

// --- Win ------------------------------------------------------------------------------

const result = ref<{ timeMs: number; newBest: boolean } | null>(null)
const showResult = ref(false)

function checkWin(): void {
  if (!game.value || !geo.value || !isSolved(geo.value, game.value.cells)) return
  stopwatch.pause()
  status.value = 'won'
  const timeMs = Math.round(stopwatch.elapsedMs.value)
  const { newBestTime } = recordFinish('crowns', game.value.puzzle.difficulty, { timeMs })
  remove(SAVE_KEY)
  result.value = { timeMs, newBest: newBestTime }
  // Let the crowns celebrate before the dialog covers the board.
  setTimeout(() => (showResult.value = true), motionEnabled.value ? 900 : 0)
}

const resultRows = computed(() => {
  if (!game.value || !result.value) return []
  const p = game.value.puzzle
  return [
    { label: t('common.difficulty'), value: t(`difficulty.${p.difficulty}`) },
    { label: t('common.size'), value: t('crowns.sizeLabel', { size: p.size }) },
    { label: t('common.time'), value: formatDuration(result.value.timeMs), highlight: result.value.newBest },
    { label: t('common.hints'), value: String(game.value.hintsUsed) },
  ]
})

function playAgain(): void {
  showResult.value = false
  const difficulty = game.value?.puzzle.difficulty ?? 'easy'
  void startNew(difficulty)
}

function goHome(): void {
  showResult.value = false
  void router.replace({ name: 'crowns' })
}

// --- Hints ------------------------------------------------------------------------------

const hint = shallowRef<Hint | null>(null)

function requestHint(): void {
  if (!game.value || status.value !== 'playing') return
  const next = getHint(game.value.puzzle, game.value.cells)
  hint.value = next
  if (next.kind === 'step' || next.kind === 'wrongCrown' || next.kind === 'wrongMark') {
    game.value.hintsUsed += 1
    persist()
  }
}

function applyCurrentHint(): void {
  if (!game.value || !hint.value) return
  game.value.cells = applyHint(game.value.cells, hint.value)
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

const showRules = ref(false)

// Start a new game (?new=<difficulty>) or resume the saved one. Runs last so that all
// state above is initialised.
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
  void router.replace({ name: 'crowns' })
}
</script>

<template>
  <AppBar :title="title" back-to="/crowns">
    <template #actions>
      <span v-if="status !== 'loading'" class="timer tabular" :aria-label="t('common.time')">
        <AppIcon name="clock" :size="18" />
        {{ formatDuration(stopwatch.elapsedMs.value) }}
      </span>
      <button type="button" class="icon-btn" :aria-label="t('crowns.play.rules')" @click="showRules = true">
        <AppIcon name="info" />
      </button>
    </template>
  </AppBar>

  <main class="play">
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
          :blocked="blocked"
          :highlight="highlight"
          :disabled="status !== 'playing'"
          :solved="status === 'won'"
          @tap="onTap"
          @paint="onPaint"
          @stroke-end="afterMove"
        />
      </div>

      <section v-if="hint" class="hint card" aria-live="polite">
        <div class="hint__head">
          <AppIcon name="hint" :size="20" class="hint__icon" />
          <h2 class="hint__title">{{ hintTitle(hint) }}</h2>
          <button type="button" class="hint__close" :aria-label="t('common.close')" @click="hint = null">
            <AppIcon name="close" :size="18" />
          </button>
        </div>
        <p class="hint__text">{{ hintText(hint) }}</p>
        <AppButton v-if="canApply" variant="primary" block @click="applyCurrentHint">
          {{ hint.kind === 'step' ? t('common.apply') : t('crowns.hint.fix') }}
        </AppButton>
      </section>

      <div v-else class="toolbar">
        <AppButton icon="hint" :disabled="status !== 'playing'" @click="requestHint">
          {{ t('common.hint') }}
        </AppButton>
        <AppButton icon="eraser" :disabled="status !== 'playing'" @click="confirmClear = true">
          {{ t('crowns.play.clear') }}
        </AppButton>
      </div>
    </template>
  </main>

  <AppDialog :open="showRules" :title="t('crowns.rules.title')" @close="showRules = false">
    <CrownsRules />
  </AppDialog>

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
    :subtitle="t('crowns.play.solvedText')"
    :rows="resultRows"
    :badge="result?.newBest ? t('common.newBest') : undefined"
  >
    <template #actions>
      <AppButton variant="primary" block @click="playAgain">{{ t('common.newGame') }}</AppButton>
      <AppButton variant="ghost" block @click="goHome">{{ t('common.back') }}</AppButton>
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

.toolbar {
  display: flex;
  gap: var(--space-2);
  justify-content: center;
  width: 100%;
}

.toolbar > * {
  flex: 1;
  max-width: 200px;
}

.hint {
  width: 100%;
  padding: var(--space-3) var(--space-4) var(--space-4);
  border-left: 4px solid var(--color-accent);
}

.hint__head {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.hint__icon {
  color: var(--color-accent);
}

.hint__title {
  flex: 1;
  font-size: var(--text-md);
  font-weight: 700;
}

.hint__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  margin-right: calc(-1 * var(--space-2));
  padding: 0;
  border: 0;
  border-radius: var(--radius-full);
  background: transparent;
  cursor: pointer;
}

.hint__text {
  margin: var(--space-2) 0 var(--space-3);
  font-size: var(--text-sm);
}
</style>
