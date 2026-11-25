<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, toRaw, triggerRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AppBar from '@/components/AppBar.vue'
import GameBackdrop from '@/components/GameBackdrop.vue'
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
import { DIFFICULTIES, SAVE_KEY, type Difficulty } from './index'
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
import { isLinksSave, type LinksSave } from './logic/types'
import { colorLabel } from './palette'
import { linksPool } from './pool'
import { linksSettings } from './settings'

const route = useRoute()
const router = useRouter()

type Status = 'loading' | 'playing' | 'won'

/** Upper bound of stored undo steps. */
const MAX_UNDO = 300

const status = ref<Status>('loading')
const game = ref<LinksSave | null>(null)
const stopwatch = useStopwatch(0)
const stroke = shallowRef<Stroke | null>(null)
const flash = ref<number | null>(null)

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
  stroke.value = null
  stopwatch.reset(0)
  // Drop ?new= right away (before awaiting the puzzle), so a reload resumes and no late
  // navigation can cancel a "back" tapped meanwhile.
  void router.replace({ name: 'links-play' })
  const next = await linksPool.take(difficulty)
  if (token !== startToken) return
  game.value = {
    puzzle: next,
    paths: next.endpoints.map(() => []),
    elapsedMs: 0,
    hintsUsed: 0,
    moves: 0,
    lastColor: null,
    undo: [],
  }
  recordStart('links', difficulty)
  status.value = 'playing'
  persist()
  stopwatch.start()
}

function resume(): boolean {
  const saved = load(SAVE_KEY, null, (raw) => (isLinksSave(raw) ? raw : undefined))
  if (!saved) return false
  game.value = saved
  stopwatch.reset(saved.elapsedMs)
  status.value = 'playing'
  stopwatch.start()
  return true
}

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

function pulse(color: number): void {
  flash.value = color
  setTimeout(() => {
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
  persist()
  checkWin()
}

const canUndo = computed(() => status.value === 'playing' && (game.value?.undo.length ?? 0) > 0)

function undo(): void {
  if (!game.value || !canUndo.value) return
  const previous = game.value.undo[game.value.undo.length - 1]!
  game.value.undo = game.value.undo.slice(0, -1)
  game.value.paths = previous
  persist()
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

const result = ref<{ timeMs: number; newBest: boolean; perfect: boolean } | null>(null)
const showResult = ref(false)

function checkWin(): void {
  if (!game.value || !isSolved(game.value.puzzle, game.value.paths)) return
  stopwatch.pause()
  status.value = 'won'
  const timeMs = Math.round(stopwatch.elapsedMs.value)
  const { newBestTime } = recordFinish('links', game.value.puzzle.difficulty, { timeMs })
  remove(SAVE_KEY)
  const perfect = game.value.moves === game.value.puzzle.endpoints.length && game.value.hintsUsed === 0
  result.value = { timeMs, newBest: newBestTime, perfect }
  setTimeout(() => (showResult.value = true), motionEnabled.value ? 700 : 0)
}

const resultRows = computed(() => {
  if (!game.value || !result.value) return []
  const p = game.value.puzzle
  const moves = `${game.value.moves}${result.value.perfect ? ` · ${t('links.result.perfect')}` : ''}`
  return [
    { label: t('common.difficulty'), value: t(`difficulty.${p.difficulty}`) },
    { label: t('common.size'), value: t('links.sizeLabel', { size: p.size }) },
    { label: t('common.time'), value: formatDuration(result.value.timeMs), highlight: result.value.newBest },
    { label: t('links.result.moves'), value: moves, highlight: result.value.perfect },
    { label: t('common.hints'), value: String(game.value.hintsUsed) },
  ]
})

function playAgain(): void {
  showResult.value = false
  void startNew(game.value?.puzzle.difficulty ?? 'easy')
}

function goToMenu(): void {
  showResult.value = false
  void returnTo(router, { name: 'links' })
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
  void router.replace({ name: 'links' })
}
</script>

<template>
  <AppBar :title="title" back-to="/links">
    <template #actions>
      <span v-if="status !== 'loading'" class="timer tabular" :aria-label="t('common.time')">
        <AppIcon name="clock" :size="18" />
        {{ formatDuration(stopwatch.elapsedMs.value) }}
      </span>
      <button type="button" class="icon-btn" :aria-label="t('links.play.rules')" @click="showRules = true">
        <AppIcon name="info" />
      </button>
    </template>
  </AppBar>

  <main class="play">
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
          :aria-label="t('links.play.undo')"
          :title="t('links.play.undo')"
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

  <AppDialog :open="showRules" :title="t('links.rules.title')" @close="showRules = false">
    <LinksRules />
  </AppDialog>

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
    :subtitle="result?.perfect ? t('links.result.perfectText') : t('links.result.solvedText')"
    :rows="resultRows"
    :badge="result?.newBest ? t('common.newBest') : undefined"
  >
    <template #actions>
      <AppButton variant="primary" block @click="playAgain">{{ t('common.newGame') }}</AppButton>
      <AppButton block @click="goToMenu">{{ t('links.play.toMenu') }}</AppButton>
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

.toolbar > .toolbar__undo {
  flex: none;
  width: var(--tap-min);
  padding: 0;
}
</style>
