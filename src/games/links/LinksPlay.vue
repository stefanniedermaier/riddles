<script setup lang="ts">
import { computed, ref, shallowRef, triggerRef } from 'vue'

import AppButton from '@/components/AppButton.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import GameBackdrop from '@/components/GameBackdrop.vue'
import LoadingOverlay from '@/components/LoadingOverlay.vue'
import PlayBar from '@/components/PlayBar.vue'
import ResultDialog from '@/components/ResultDialog.vue'
import { formatDuration } from '@/core/format'
import { t } from '@/core/i18n'
import { showToast } from '@/core/toast'
import { usePuzzleSession } from '@/core/usePuzzleSession'
import { DIFFICULTIES, saveSlot } from './index'
import LinksBoard from './LinksBoard.vue'
import LinksRules from './LinksRules.vue'
import {
  applyHint,
  beginStroke,
  countMove,
  coveredCells,
  extendStroke,
  hintColor,
  isConnected,
  isSolved,
  samePath,
  strokePaths,
  type Stroke,
} from './logic/rules'
import type { LinksSave } from './logic/types'
import { colorLabel } from './palette'
import { linksPool } from './pool'
import { linksSettings } from './settings'
import type { PlayRouteProps } from '../routes'

/** Upper bound of stored undo steps. */
const MAX_UNDO = 300

const stroke = shallowRef<Stroke | null>(null)
const flash = ref<number | null>(null)

const props = defineProps<PlayRouteProps>()

const session = usePuzzleSession({
  gameId: 'links',
  slot: saveSlot,
  variants: DIFFICULTIES,
  newGame: () => props.newGame,
  variantOf: (save) => save.puzzle.difficulty,
  create: async (difficulty): Promise<LinksSave> => {
    const next = await linksPool.take(difficulty)
    return {
      puzzle: next,
      paths: next.endpoints.map(() => []),
      elapsedMs: 0,
      hintsUsed: 0,
      moves: 0,
      lastColor: null,
      undo: [],
    }
  },
  onShow: () => (stroke.value = null),
  onUndo: () => undo(),
  resultDelayMs: 700,
})
const { status, game, stopwatch, result, showResult, showRules, saveProgress } = session

const puzzle = computed(() => game.value?.puzzle ?? null)

/** Lines shown on the board (live while a stroke is in progress). */
const shownPaths = computed<number[][]>(() => {
  if (stroke.value) return strokePaths(stroke.value)
  return game.value?.paths ?? []
})
const connected = computed(() =>
  puzzle.value ? shownPaths.value.map((path, color) => isConnected(puzzle.value!, color, path)) : [],
)
const connectedCount = computed(() => connected.value.filter(Boolean).length)
const filledPercent = computed(() =>
  puzzle.value ? Math.round((coveredCells(shownPaths.value) / (puzzle.value.size * puzzle.value.size)) * 100) : 0,
)

const title = computed(() =>
  puzzle.value ? `${t('links.name')} · ${t(`difficulty.${puzzle.value.difficulty}`)}` : t('links.name'),
)

// --- Drawing ---------------------------------------------------------------------------

function onStart(cell: number): void {
  if (!game.value || status.value !== 'playing') return
  stroke.value = beginStroke(game.value.puzzle, game.value.paths, cell)
}

function onMove(cell: number): void {
  if (!game.value || !stroke.value) return
  if (extendStroke(game.value.puzzle, stroke.value, cell)) triggerRef(stroke)
}

function changed(next: readonly number[][]): boolean {
  return !game.value || next.some((path, color) => !samePath(path, game.value!.paths[color]!))
}

/** Stores a new board state as one undo step. */
function commit(next: number[][]): void {
  if (!game.value) return
  game.value.undo = [...game.value.undo, game.value.paths].slice(-MAX_UNDO)
  game.value.paths = next
}

/** Highlights a line that just got connected (the timer is cleared when leaving). */
function pulse(color: number): void {
  flash.value = color
  session.later(() => {
    if (flash.value === color) flash.value = null
  }, 700)
}

function onEnd(): void {
  const current = stroke.value
  stroke.value = null
  if (!game.value || !current) return
  const next = strokePaths(current)
  if (!changed(next)) return
  const wasConnected = isConnected(game.value.puzzle, current.color, game.value.paths[current.color]!)
  commit(next)
  const counted = countMove(game.value.moves, game.value.lastColor, current.color)
  game.value.moves = counted.moves
  game.value.lastColor = counted.lastColor
  if (!wasConnected && isConnected(game.value.puzzle, current.color, next[current.color]!)) pulse(current.color)
  afterChange()
}

function afterChange(): void {
  saveProgress()
  checkWin()
}

const canUndo = computed(() => status.value === 'playing' && (game.value?.undo.length ?? 0) > 0)

function undo(): void {
  if (!game.value || !canUndo.value) return
  const previous = game.value.undo[game.value.undo.length - 1]!
  game.value.undo = game.value.undo.slice(0, -1)
  game.value.paths = previous
  saveProgress()
}

const confirmRestart = ref(false)

function restart(): void {
  confirmRestart.value = false
  if (!game.value) return
  const empty = game.value.paths.map(() => [])
  if (changed(empty)) {
    commit(empty)
    afterChange()
  }
}

// --- Hints -----------------------------------------------------------------------------

function requestHint(): void {
  if (!game.value || status.value !== 'playing') return
  const color = hintColor(game.value.puzzle, game.value.paths)
  if (color === null) {
    showToast(t('links.play.noHint'))
    return
  }
  commit(applyHint(game.value.puzzle, game.value.paths, color))
  game.value.hintsUsed += 1
  pulse(color)
  showToast(t('links.play.hintShown', { color: colorLabel(color) }))
  afterChange()
}

// --- Win -------------------------------------------------------------------------------

function checkWin(): void {
  if (!game.value || !isSolved(game.value.puzzle, game.value.paths)) return
  session.win()
}

/** Solved with one move per colour and no hints (the board is frozen once won). */
const perfect = computed(
  () =>
    !!result.value &&
    !!game.value &&
    game.value.moves === game.value.puzzle.endpoints.length &&
    game.value.hintsUsed === 0,
)

const resultRows = computed(() => {
  if (!game.value || !result.value) return []
  const p = game.value.puzzle
  const moves = `${game.value.moves}${perfect.value ? ` · ${t('links.result.perfect')}` : ''}`
  return [
    { label: t('common.difficulty'), value: t(`difficulty.${p.difficulty}`) },
    { label: t('common.size'), value: t('links.sizeLabel', { size: p.size }) },
    { label: t('common.time'), value: formatDuration(result.value.timeMs), highlight: result.value.newBest },
    { label: t('links.result.moves'), value: moves, highlight: perfect.value },
    { label: t('common.hints'), value: String(game.value.hintsUsed) },
  ]
})

session.init()
</script>

<template>
  <PlayBar
    v-model:rules-open="showRules"
    :title="title"
    back-to="/links"
    :elapsed-ms="status === 'loading' ? null : stopwatch.elapsedMs.value"
    :rules-label="t('links.play.rules')"
    :rules-title="t('links.rules.title')"
  >
    <LinksRules />
  </PlayBar>

  <main class="puzzle-play">
    <GameBackdrop game="links" />
    <LoadingOverlay v-if="status === 'loading' || !game" :label="t('common.generating')" />

    <template v-else>
      <dl class="hud tabular">
        <div>
          <dt>{{ t('links.play.connected') }}</dt>
          <dd>{{ connectedCount }} / {{ game.puzzle.endpoints.length }}</dd>
        </div>
        <div>
          <dt>{{ t('links.play.filled') }}</dt>
          <dd>{{ filledPercent }} %</dd>
        </div>
        <div>
          <dt>{{ t('links.play.moves') }}</dt>
          <dd>{{ game.moves }}</dd>
        </div>
      </dl>

      <div class="board-wrap">
        <LinksBoard
          :size="game.puzzle.size"
          :endpoints="game.puzzle.endpoints"
          :paths="shownPaths"
          :connected="connected"
          :show-labels="linksSettings.showLabels"
          :flash="flash"
          :disabled="status !== 'playing'"
          @start="onStart"
          @move="onMove"
          @end="onEnd"
        />
      </div>

      <div class="toolbar">
        <AppButton
          class="toolbar__undo"
          icon="undo"
          :disabled="!canUndo"
          :label="t('links.play.undo')"
          @click="undo"
        />
        <AppButton icon="hint" :disabled="status !== 'playing'" @click="requestHint">
          {{ t('common.hint') }}
        </AppButton>
        <AppButton icon="restart" :disabled="status !== 'playing'" @click="confirmRestart = true">
          {{ t('links.play.restart') }}
        </AppButton>
      </div>
    </template>
  </main>

  <ConfirmDialog
    :open="confirmRestart"
    :message="t('links.play.restartConfirm')"
    :confirm-label="t('links.play.restart')"
    danger
    @confirm="restart"
    @cancel="confirmRestart = false"
  />

  <ResultDialog
    :open="showResult"
    :title="t('common.solved')"
    :share="result && game ? { game: 'links', variant: game.puzzle.difficulty, result: formatDuration(result.timeMs), kind: 'time', newBest: result.newBest } : undefined"
    :subtitle="perfect ? t('links.result.perfectText') : t('links.result.solvedText')"
    :rows="resultRows"
    :badge="result?.newBest ? t('common.newBest') : undefined"
  >
    <template #actions>
      <AppButton variant="primary" block @click="session.playAgain">{{ t('common.newGame') }}</AppButton>
      <AppButton block @click="session.goToMenu">{{ t('links.play.toMenu') }}</AppButton>
      <AppButton variant="ghost" icon="home" block @click="session.goHome">{{ t('common.home') }}</AppButton>
    </template>
  </ResultDialog>
</template>

<style scoped>
.hud {
  gap: var(--space-5);
  margin: 0;
}

.hud div {
  display: flex;
  flex-direction: column;
  align-items: center;
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

.board-wrap {
  /* Width-bound on phones, height-bound on short screens. */
  width: min(100%, 520px, calc(100dvh - 290px - env(safe-area-inset-top) - env(safe-area-inset-bottom)));
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
