<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { useRouter } from 'vue-router'

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
import type { PlayRouteProps } from '../routes'
import { useCountdown } from '@/core/timer'
import { showToast } from '@/core/toast'
import { useBoardAnimator } from './animator'
import { useShapesJuice } from './useShapesJuice'
import { findAnyMove } from './logic/board'
import { getLevel, goalStatus } from './logic/levels'
import { completeLevel, createRun, playMove, type ShapesRun } from './logic/modes'
import type { Mode } from './logic/types'
import { IDLE_HINT_MS, shapesSettings } from './settings'
import BoardParticles from './BoardParticles.vue'
import GardenBackdrop from './GardenBackdrop.vue'
import ShapesBoard from './ShapesBoard.vue'
import ShapesHud from './ShapesHud.vue'
import ShapesRules from './ShapesRules.vue'
import { clearRun, levelProgress, loadRun, recordLevelWin, saveRun } from './store'

const props = defineProps<PlayRouteProps & { mode: Mode }>()

const router = useRouter()

// ---------------------------------------------------------------------------
// Run setup: either a new run (`?new=1`, optionally `&level=n`) or the saved one.

function newRun(level?: number): ShapesRun {
  return createRun(props.mode, randomSeed(), level ?? 1)
}

const isNew = props.newGame === '1'
// Levels are played in order: a new level run always starts the current level.
const initial: ShapesRun | null = isNew
  ? newRun(levelProgress.value.level)
  : loadRun(props.mode)

const run = shallowRef<ShapesRun | null>(initial)
const finished = ref(false)

const animator = useBoardAnimator(motionEnabled)
const displayScore = ref(initial?.score ?? 0)

const boardWrap = ref<HTMLElement | null>(null)
const juice = useShapesJuice({
  boardWrap,
  displayScore,
  realScore: () => run.value?.score ?? 0,
  effects: animator.effects,
  // A praise word holds back a pending result dialog (it would cover the praise).
  onPraise: () => clearTimeout(resultTimer),
})
const { flights, scoreBump, praise } = juice

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
const showRules = ref(false)
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
    showRules.value ||
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

  const onClearPraise = juice.praiseTracker()
  await animator.play(outcome.result.phases, outcome.result.board, {
    onClear: (score, cells) => {
      juice.flyPoints(score, cells)
      onClearPraise(cells)
    },
    onShuffle: () => showToast(t('shapes.board.shuffled')),
  }, run.value?.level?.field)
  // Points still in the air land a moment later; then the shown score is exact again.
  juice.settleScore(() => finished.value)

  if (outcome.levelState === 'won') finishLevel(true)
  else if (outcome.levelState === 'lost') finishLevel(false)
  else if (timeUpPending.value) endTimeRun()
  else scheduleHint()
}

/**
 * The result dialog opens right away for a win; after a loss the pieces first tumble off
 * the board (`collapsing`), then the dialog follows.
 */
const resultOpen = ref(false)
const collapsing = ref(false)
const COLLAPSE_MS = 1100
let resultTimer: ReturnType<typeof setTimeout> | undefined

watch(result, (r) => {
  clearTimeout(resultTimer)
  if (!r) {
    resultOpen.value = false
    collapsing.value = false
    return
  }
  const lost = r.kind === 'lost' || (r.kind === 'time' && !r.newBest)
  if (lost && motionEnabled.value) {
    collapsing.value = true
    resultTimer = setTimeout(() => (resultOpen.value = true), COLLAPSE_MS)
  } else {
    resultOpen.value = true
  }
})

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
  juice.resetForRun()
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

function restartRun(): void {
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
  [menuOpen, showRules, result, finished],
  () => {
    if (!countdown) return
    if (menuOpen.value || showRules.value || result.value || finished.value) countdown.pause()
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
  // The rest of a move's animation belongs to this view only (the juice cleans up itself).
  animator.stop()
  clearHint()
  clearTimeout(resultTimer)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>

<template>
  <GardenBackdrop />
  <AppBar class="play-bar" :title="title" :back-to="{ name: 'shapes' }">
    <template #actions>
      <button type="button" class="icon-btn" :aria-label="t('common.rules')" @click="showRules = true">
        <AppIcon name="info" />
      </button>
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
        :collapse="collapsing"
        @swap="onSwap"
        @select="selected = $event"
        @interact="scheduleHint"
      />
      <BoardParticles
        :effects="animator.effects.value"
        :field="animator.field.value"
        :animating="animator.animating.value"
      />
      <Transition name="praise">
        <div v-if="praise" :key="praise.id" class="praise" :class="`praise--${praise.word}`" aria-hidden="true">
          {{ t(`shapes.praise.${praise.word}`) }}
        </div>
      </Transition>
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
      <AppButton icon="restart" block @click="restartRun">
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
    :open="resultOpen"
    :title="resultTitle"
    :subtitle="result?.kind === 'lost' ? t('shapes.result.levelFailedText') : undefined"
    :rows="resultRows"
    :share="
      result && result.kind !== 'lost'
        ? {
            game: 'shapes',
            variant: result.kind === 'won' ? 'levels' : result.kind,
            result: formatNumber(result.kind === 'won' ? result.total : result.score),
            kind: 'score',
            newBest: result.kind !== 'won' && result.newBest,
          }
        : undefined
    "
    :badge="
      (result?.kind === 'time' || result?.kind === 'zen') && result.newBest
        ? t('common.newBest')
        : undefined
    "
    :icon="result?.kind === 'lost' ? 'restart' : 'trophy'"
    :celebrate="
      result?.kind === 'won' ||
      ((result?.kind === 'time' || result?.kind === 'zen') && result.newBest)
    "
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
  <AppDialog :open="showRules" :title="t('shapes.lobby.howToTitle')" @close="showRules = false">
    <ShapesRules />
  </AppDialog>
</template>

<style scoped>
.play {
  position: relative;
  z-index: 1;
  /* The particle canvas reaches beyond the board; never let it widen the page. */
  overflow-x: clip;
  display: flex;
  flex-direction: column;
  padding-top: var(--space-2);
}

.flights {
  position: fixed;
  inset: 0;
  z-index: var(--z-flight);
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
  position: relative;
  min-width: 260px;
  margin: 0 auto;
  /* Wooden frame around the board: bevel highlights, a dark outline and a drop shadow. */
  padding: 7px;
  border-radius: 23px;
  background:
    linear-gradient(180deg, rgb(255 255 255 / 22%), transparent 40%),
    repeating-linear-gradient(92deg, #b97a43 0 9px, #a96c38 9px 15px, #c4864d 15px 26px);
  box-shadow:
    0 0 0 2.5px #5a3515,
    inset 0 2px 0 rgb(255 230 190 / 60%),
    inset 0 -3px 0 rgb(60 30 0 / 35%),
    0 12px 26px rgb(30 20 0 / 40%);
}

:root[data-theme='dark'] .board-wrap {
  background:
    linear-gradient(180deg, rgb(255 255 255 / 10%), transparent 40%),
    repeating-linear-gradient(92deg, #6b4a32 0 9px, #5e402b 9px 15px, #74513a 15px 26px);
  box-shadow:
    0 0 0 2.5px #24160c,
    inset 0 2px 0 rgb(255 220 180 / 25%),
    inset 0 -3px 0 rgb(0 0 0 / 40%),
    0 12px 26px rgb(0 0 0 / 55%);
}

/* The app bar floats over the garden sky. */
.play-bar {
  background: linear-gradient(180deg, rgb(255 255 255 / 45%), rgb(255 255 255 / 0%));
}

:root[data-theme='dark'] .play-bar {
  background: linear-gradient(180deg, rgb(10 12 30 / 55%), rgb(10 12 30 / 0%));
}

.board-wrap--levels {
  width: min(
    100%,
    520px,
    calc(100dvh - 250px - env(safe-area-inset-top) - env(safe-area-inset-bottom))
  );
}

/* --- Praise ("Great!") ---------------------------------------------------------- */

.praise {
  --praise-top: #fff6b0;
  --praise-mid: var(--gold);
  --praise-bottom: #ff7a00;
  --praise-edge: #7a3a00;

  position: absolute;
  top: 42%;
  left: 50%;
  z-index: var(--z-board-praise);
  font-size: clamp(2rem, 11vw, 3.4rem);
  font-weight: 900;
  letter-spacing: 0.01em;
  line-height: 1;
  white-space: nowrap;
  color: transparent;
  background: linear-gradient(180deg, var(--praise-top) 15%, var(--praise-mid) 50%, var(--praise-bottom) 90%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-stroke: 1.5px var(--praise-edge);
  filter: drop-shadow(0 3px 0 var(--praise-edge)) drop-shadow(0 6px 10px rgb(0 0 0 / 35%));
  pointer-events: none;
  transform: translate(-50%, -50%);
  animation: praise-in 1.1s cubic-bezier(0.2, 0.9, 0.3, 1) forwards;
}

.praise--good {
  --praise-top: #e4ffc8;
  --praise-mid: #7ee05a;
  --praise-bottom: #2a9a3a;
  --praise-edge: #10501d;
}

.praise--great {
  --praise-top: #e0f4ff;
  --praise-mid: #59c8ff;
  --praise-bottom: #2f6bff;
  --praise-edge: #102c80;
}

.praise--amazing {
  --praise-top: #ffe0f2;
  --praise-mid: #ff6fc0;
  --praise-bottom: #b02fd6;
  --praise-edge: #4f0a63;
}

@keyframes praise-in {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.3) rotate(-8deg);
  }
  18% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.18) rotate(3deg);
  }
  30% {
    transform: translate(-50%, -50%) scale(0.96) rotate(-1deg);
  }
  40%,
  75% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -80%) scale(1.05);
  }
}

.praise-leave-active {
  transition: opacity var(--dur-fast);
}

.praise-leave-to {
  opacity: 0;
}

.menu {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
</style>
