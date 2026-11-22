<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AppBar from '@/components/AppBar.vue'
import AppButton from '@/components/AppButton.vue'
import AppDialog from '@/components/AppDialog.vue'
import AppIcon from '@/components/AppIcon.vue'
import ResultDialog from '@/components/ResultDialog.vue'
import { formatNumber } from '@/core/format'
import { t } from '@/core/i18n'
import { returnTo } from '@/core/navigation'
import { randomSeed } from '@/core/rng'
import { getVariantStats, recordFinish, recordStart } from '@/core/stats'
import { motionEnabled } from '@/core/theme'
import { useCountdown } from '@/core/timer'
import { showToast } from '@/core/toast'
import { useBoardAnimator } from './animator'
import { findAnyMove } from './logic/board'
import { getLevel, goalStatus } from './logic/levels'
import { completeLevel, createRun, playMove, type ShapesRun } from './logic/modes'
import type { Mode } from './logic/types'
import { IDLE_HINT_MS, shapesSettings } from './settings'
import ShapesBoard from './ShapesBoard.vue'
import ShapesHud from './ShapesHud.vue'
import { clearRun, levelProgress, loadRun, recordLevelWin, saveRun } from './store'

const props = defineProps<{ mode: Mode }>()

const route = useRoute()
const router = useRouter()

// ---------------------------------------------------------------------------
// Run setup: either a new run (`?new=1`, optionally `&level=n`) or the saved one.

function newRun(level?: number): ShapesRun {
  return createRun(props.mode, randomSeed(), level ?? 1)
}

const isNew = route.query.new === '1'
// Levels are played in order: a new level run always starts the current level.
const initial: ShapesRun | null = isNew
  ? newRun(levelProgress.value.level)
  : loadRun(props.mode)

const run = shallowRef<ShapesRun | null>(initial)
const finished = ref(false)

const animator = useBoardAnimator(motionEnabled)
const displayScore = ref(initial?.score ?? 0)

// ---------------------------------------------------------------------------
// Points flying from the cleared pieces to the score

interface Flight {
  id: number
  x: number
  y: number
  dx: number
  dy: number
  text: string
}

const FLY_MS = 650
const boardWrap = ref<HTMLElement | null>(null)
const flights = ref<Flight[]>([])
const scoreBump = ref(0)
let flightId = 1
/** Changes with every new run, so points of an old run never land in a new one. */
let runToken = 0

/** Adds points to the shown score without overtaking the real one. */
function addShownScore(points: number): void {
  const cap = run.value?.score ?? 0
  if (displayScore.value >= cap) return
  displayScore.value = Math.min(cap, displayScore.value + points)
  scoreBump.value++
}

function flyPoints(score: number, cells: number[]): void {
  if (score <= 0) return
  const board = boardWrap.value?.getBoundingClientRect()
  const target = document.querySelector('[data-score-target]')?.getBoundingClientRect()
  if (!motionEnabled.value || !board || !target || board.width === 0 || cells.length === 0) {
    addShownScore(score)
    return
  }
  const cell = board.width / 8
  const row = cells.reduce((sum, c) => sum + Math.floor(c / 8), 0) / cells.length
  const col = cells.reduce((sum, c) => sum + (c % 8), 0) / cells.length
  const x = board.left + (col + 0.5) * cell
  const y = board.top + (row + 0.5) * cell
  const id = flightId++
  const token = runToken
  flights.value = [
    ...flights.value,
    {
      id,
      x,
      y,
      dx: target.left + target.width / 2 - x,
      dy: target.top + target.height / 2 - y,
      text: `+${formatNumber(score)}`,
    },
  ]
  setTimeout(() => {
    flights.value = flights.value.filter((flight) => flight.id !== id)
    if (token === runToken) addShownScore(score)
  }, FLY_MS)
}
if (initial) animator.show(initial.board, initial.level?.field)

// ---------------------------------------------------------------------------
// Time mode

const timeUpPending = ref(false)
const bonusMs = ref(0)
const bonusKey = ref(0)

const countdown =
  props.mode === 'time' && initial?.time
    ? useCountdown(initial.time.limitMs, onTimeUp, initial.time.elapsedMs)
    : null

function onTimeUp(): void {
  if (animator.animating.value) timeUpPending.value = true
  else endTimeRun()
}

// ---------------------------------------------------------------------------
// UI state

const menuOpen = ref(false)
const selected = ref<number | null>(null)
const hint = ref<[number, number] | null>(null)

type ResultState =
  | { kind: 'time' | 'zen'; score: number; best: number; newBest: boolean }
  | { kind: 'won'; level: number; score: number; bonus: number; total: number }
  | { kind: 'lost'; level: number; score: number }

const result = ref<ResultState | null>(null)

const locked = computed(
  () =>
    animator.animating.value ||
    menuOpen.value ||
    result.value !== null ||
    timeUpPending.value ||
    finished.value,
)

const levelDef = computed(() => (run.value?.level ? getLevel(run.value.level.n) : null))
const goals = computed(() =>
  run.value?.level && levelDef.value
    ? goalStatus(levelDef.value, run.value.score, run.value.level.progress, run.value.level.field)
    : undefined,
)

const title = computed(() =>
  props.mode === 'levels' && run.value?.level
    ? t('shapes.hud.level', { level: run.value.level.n })
    : t(`shapes.modes.${props.mode}`),
)

// ---------------------------------------------------------------------------
// Persistence

function persist(): void {
  const current = run.value
  if (!current || finished.value) return
  if (current.movesMade === 0) {
    // Untouched runs are not saved, so merely opening a mode does not leave a "Continue"
    // behind (and an older save of this mode is dropped).
    clearRun(props.mode)
    return
  }
  if (countdown && current.time) {
    saveRun({
      ...current,
      time: { limitMs: countdown.limitMs.value, elapsedMs: countdown.elapsedMs.value },
    })
  } else {
    saveRun(current)
  }
}

function onVisibilityChange(): void {
  if (document.hidden) persist()
}

// ---------------------------------------------------------------------------
// Idle hint

let hintTimer: ReturnType<typeof setTimeout> | undefined

function clearHint(): void {
  clearTimeout(hintTimer)
  hint.value = null
}

function scheduleHint(): void {
  clearHint()
  if (!shapesSettings.value.idleHint) return
  hintTimer = setTimeout(() => {
    if (locked.value || !run.value) return
    const move = findAnyMove(run.value.board, run.value.level?.field)
    hint.value = move ? [move.a, move.b] : null
  }, IDLE_HINT_MS)
}

// ---------------------------------------------------------------------------
// Playing

async function onSwap(a: number, b: number): Promise<void> {
  const current = run.value
  if (!current || locked.value) return
  clearHint()
  selected.value = null

  const outcome = playMove(current, a, b)
  if (outcome.result.valid) {
    run.value = outcome.run
    if (countdown && outcome.timeBonusMs > 0) {
      countdown.addTime(outcome.timeBonusMs)
      bonusMs.value = outcome.timeBonusMs
      bonusKey.value++
    }
    persist()
  }

  await animator.play(outcome.result.phases, outcome.result.board, {
    onClear: (score, cells) => flyPoints(score, cells),
    onShuffle: () => showToast(t('shapes.board.shuffled')),
  }, run.value?.level?.field)
  // Points still in the air land a moment later; then the shown score is exact again.
  const token = runToken
  setTimeout(() => {
    if (token === runToken && !finished.value) displayScore.value = run.value?.score ?? 0
  }, FLY_MS + 50)

  if (outcome.levelState === 'won') finishLevel(true)
  else if (outcome.levelState === 'lost') finishLevel(false)
  else if (timeUpPending.value) endTimeRun()
  else scheduleHint()
}

function endTimeRun(): void {
  const current = run.value
  if (!current || finished.value) return
  timeUpPending.value = false
  finished.value = true
  clearHint()
  clearRun('time')
  const { newBestScore } = recordFinish('shapes', 'time', { score: current.score })
  result.value = {
    kind: 'time',
    score: current.score,
    best: getVariantStats('shapes', 'time').bestScore ?? current.score,
    newBest: newBestScore,
  }
}

function finishLevel(won: boolean): void {
  const current = run.value
  if (!current?.level || finished.value) return
  finished.value = true
  clearHint()
  clearRun('levels')
  if (won) {
    const done = completeLevel(current)
    recordLevelWin(current.level.n)
    recordFinish('shapes', 'levels', { score: done.finalScore })
    displayScore.value = done.finalScore
    result.value = {
      kind: 'won',
      level: current.level.n,
      score: current.score,
      bonus: done.bonus,
      total: done.finalScore,
    }
  } else {
    result.value = { kind: 'lost', level: current.level.n, score: current.score }
  }
}

/** Replaces the current run (new game, next level, retry). */
function startRun(next: ShapesRun): void {
  runToken++
  flights.value = []
  run.value = next
  finished.value = false
  result.value = null
  menuOpen.value = false
  timeUpPending.value = false
  selected.value = null
  bonusMs.value = 0
  displayScore.value = next.score
  animator.show(next.board, next.level?.field)
  recordStart('shapes', props.mode)
  if (countdown && next.time) {
    countdown.reset(next.time.limitMs, next.time.elapsedMs)
    countdown.start()
  }
  persist()
  scheduleHint()
}

// ---------------------------------------------------------------------------
// Menu & result actions

function openMenu(): void {
  clearHint()
  selected.value = null
  menuOpen.value = true
}

function resume(): void {
  menuOpen.value = false
  scheduleHint()
}

function newGame(): void {
  const current = run.value
  if (props.mode === 'zen' && current && current.score > 0) {
    recordFinish('shapes', 'zen', { score: current.score })
  }
  startRun(newRun(current?.level?.n))
}

/** Ends an endless Zen run: records the score, removes the save and shows the result. */
function endZen(): void {
  const current = run.value
  if (!current || finished.value) return
  menuOpen.value = false
  finished.value = true
  clearHint()
  clearRun('zen')
  const { newBestScore } =
    current.score > 0
      ? recordFinish('shapes', 'zen', { score: current.score })
      : { newBestScore: false }
  result.value = {
    kind: 'zen',
    score: current.score,
    best: getVariantStats('shapes', 'zen').bestScore ?? current.score,
    newBest: newBestScore,
  }
}

/** Plays the current level (the next one after a win, the same one after a loss). */
function playCurrentLevel(): void {
  startRun(createRun('levels', 0, levelProgress.value.level))
}

function toLobby(): void {
  // returnTo avoids piling up history entries (push would make "back" return to the game).
  void returnTo(router, { name: 'shapes' })
}

function toHome(): void {
  void returnTo(router, { name: 'home' })
}

const resultRows = computed(() => {
  const r = result.value
  if (!r) return []
  switch (r.kind) {
    case 'time':
    case 'zen':
      return [
        { label: t('common.score'), value: formatNumber(r.score), highlight: r.newBest },
        { label: t('common.best'), value: formatNumber(r.best) },
      ]
    case 'won':
      return [
        { label: t('common.score'), value: formatNumber(r.score) },
        { label: t('shapes.result.moveBonus'), value: `+${formatNumber(r.bonus)}` },
        { label: t('shapes.result.total'), value: formatNumber(r.total), highlight: true },
      ]
    case 'lost':
    default:
      return [{ label: t('common.score'), value: formatNumber(r.score) }]
  }
})

const resultTitle = computed(() => {
  switch (result.value?.kind) {
    case 'time':
      return t('shapes.result.timeUp')
    case 'zen':
      return t('shapes.result.zenEnded')
    case 'won':
      return t('shapes.result.levelComplete')
    case 'lost':
      return t('shapes.result.levelFailed')
    default:
      return ''
  }
})

// ---------------------------------------------------------------------------
// Lifecycle

// The timer runs only while actually playing.
watch(
  [menuOpen, result, finished],
  () => {
    if (!countdown) return
    if (menuOpen.value || result.value || finished.value) countdown.pause()
    else countdown.start()
  },
  { immediate: false },
)

onMounted(() => {
  if (!run.value) {
    // Nothing to resume – back to the lobby.
    void router.replace({ name: 'shapes' })
    return
  }
  if (isNew) {
    recordStart('shapes', props.mode)
    persist() // clears an older save of this mode; the new run is saved after the first move
    // Drop `?new=1` so that a reload resumes this run instead of starting another one.
    void router.replace({ name: 'shapes-play', params: { mode: props.mode } })
  }
  countdown?.start()
  document.addEventListener('visibilitychange', onVisibilityChange)
  scheduleHint()
})

onBeforeUnmount(() => {
  persist()
  clearHint()
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>

<template>
  <AppBar :title="title" :back-to="{ name: 'shapes' }">
    <template #actions>
      <button
        v-if="run"
        type="button"
        class="icon-btn"
        :aria-label="t('common.pause')"
        :disabled="finished"
        @click="openMenu"
      >
        <AppIcon name="pause" />
      </button>
    </template>
  </AppBar>

  <main v-if="run" class="page play">
    <ShapesHud
      :mode="mode"
      :score="displayScore"
      :remaining-ms="countdown?.remainingMs.value"
      :bonus-ms="bonusMs"
      :bonus-key="bonusKey"
      :moves-left="run.level?.movesLeft"
      :goals="goals"
      :score-bump="scoreBump"
    />
    <div ref="boardWrap" class="board-wrap" :class="{ 'board-wrap--levels': mode === 'levels' }">
      <ShapesBoard
        :pieces="animator.pieces.value"
        :effects="animator.effects.value"
        :field="animator.field.value"
        :selected="selected"
        :hint="hint"
        :locked="locked"
        @swap="onSwap"
        @select="selected = $event"
        @interact="scheduleHint"
      />
    </div>
    <div class="flights" aria-hidden="true">
      <span
        v-for="flight in flights"
        :key="flight.id"
        class="flight tabular"
        :style="{
          left: `${flight.x}px`,
          top: `${flight.y}px`,
          '--dx': `${flight.dx}px`,
          '--dy': `${flight.dy}px`,
        }"
      >
        {{ flight.text }}
      </span>
    </div>
  </main>

  <AppDialog :open="menuOpen" :title="t('shapes.pause.title')" @close="resume">
    <div class="menu">
      <AppButton variant="primary" icon="play" block @click="resume">
        {{ t('common.resume') }}
      </AppButton>
      <AppButton icon="restart" block @click="newGame">
        {{ mode === 'levels' ? t('shapes.pause.restartLevel') : t('shapes.pause.newGame') }}
      </AppButton>
      <AppButton v-if="mode === 'zen'" icon="check" block @click="endZen">
        {{ t('shapes.pause.endGame') }}
      </AppButton>
      <AppButton variant="ghost" icon="back" block @click="toLobby">
        {{ t('shapes.pause.quit') }}
      </AppButton>
    </div>
  </AppDialog>

  <ResultDialog
    :open="result !== null"
    :title="resultTitle"
    :subtitle="result?.kind === 'lost' ? t('shapes.result.levelFailedText') : undefined"
    :rows="resultRows"
    :badge="
      (result?.kind === 'time' || result?.kind === 'zen') && result.newBest
        ? t('common.newBest')
        : undefined
    "
    :icon="result?.kind === 'lost' ? 'restart' : 'trophy'"
  >
    <template #actions>
      <template v-if="result?.kind === 'time' || result?.kind === 'zen'">
        <AppButton variant="primary" block @click="startRun(newRun())">
          {{ t('shapes.result.playAgain') }}
        </AppButton>
        <AppButton block @click="toLobby">{{ t('shapes.result.menu') }}</AppButton>
      </template>
      <template v-else-if="result?.kind === 'won'">
        <AppButton variant="primary" block @click="playCurrentLevel">
          {{ t('shapes.result.nextLevel') }}
        </AppButton>
      </template>
      <template v-else-if="result?.kind === 'lost'">
        <AppButton variant="primary" block @click="playCurrentLevel">
          {{ t('shapes.result.retry') }}
        </AppButton>
      </template>
      <AppButton variant="ghost" icon="home" block @click="toHome">{{ t('common.home') }}</AppButton>
    </template>
  </ResultDialog>
</template>

<style scoped>
.play {
  display: flex;
  flex-direction: column;
  padding-top: var(--space-2);
}

.flights {
  position: fixed;
  inset: 0;
  z-index: 20;
  pointer-events: none;
}

.flight {
  position: absolute;
  padding: 2px 9px;
  border-radius: var(--radius-full);
  background: linear-gradient(180deg, #ffd84a, #ff9a1f);
  box-shadow: 0 2px 6px rgb(0 0 0 / 30%);
  color: #3a1d00;
  font-size: var(--text-sm);
  font-weight: 800;
  white-space: nowrap;
  transform: translate(-50%, -50%);
  animation: flight 0.65s cubic-bezier(0.5, 0, 0.75, 0.6) forwards;
}

@keyframes flight {
  0% {
    transform: translate(-50%, -50%) scale(0.6);
    opacity: 0;
  }
  18% {
    transform: translate(-50%, -90%) scale(1.15);
    opacity: 1;
  }
  100% {
    transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(0.7);
    opacity: 0.85;
  }
}

.board-wrap {
  width: min(
    100%,
    520px,
    calc(100dvh - 210px - env(safe-area-inset-top) - env(safe-area-inset-bottom))
  );
  min-width: 260px;
  margin: 0 auto;
}

.board-wrap--levels {
  width: min(
    100%,
    520px,
    calc(100dvh - 250px - env(safe-area-inset-top) - env(safe-area-inset-bottom))
  );
}

.menu {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
</style>
